import pdfMake from 'pdfmake/build/pdfmake.js';
import { format } from 'date-fns';
import { GstCalculation, CREATOR_GST_CONFIG } from './invoiceService.js';

// Use built-in fonts in pdfmake (no external dependency)
const FONTS = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
};

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  seller: {
    name: string;
    gstin?: string;
    address?: string;
    stateCode?: string;
  };
  buyer: {
    name: string;
    gstin?: string;
    address?: string;
    stateCode?: string;
  };
  serviceDescription: string;
  gst: GstCalculation;
  notes?: string;
}

export function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  const { gst } = data;

  const rows: any[] = [
    [
      { text: 'Description', style: 'tableHeader' },
      { text: 'HSN/SAC', style: 'tableHeader' },
      { text: 'Amount', style: 'tableHeader', alignment: 'right' },
    ],
    [
      data.serviceDescription,
      CREATOR_GST_CONFIG.hsnCode,
      { text: `₹${gst.baseAmount.toLocaleString('en-IN')}`, alignment: 'right' },
    ],
  ];

  if (gst.supplyType === 'intrastate') {
    rows.push(
      [{ text: `CGST @ ${gst.gstRate / 2}%`, colSpan: 2 }, '', { text: `₹${gst.cgstAmount!.toLocaleString('en-IN')}`, alignment: 'right' }],
      [{ text: `SGST @ ${gst.gstRate / 2}%`, colSpan: 2 }, '', { text: `₹${gst.sgstAmount!.toLocaleString('en-IN')}`, alignment: 'right' }]
    );
  } else {
    rows.push(
      [{ text: `IGST @ ${gst.gstRate}%`, colSpan: 2 }, '', { text: `₹${gst.igstAmount!.toLocaleString('en-IN')}`, alignment: 'right' }]
    );
  }

  rows.push([
    { text: 'TOTAL', colSpan: 2, bold: true, fontSize: 11 },
    '',
    { text: `₹${gst.totalAmount.toLocaleString('en-IN')}`, alignment: 'right', bold: true, fontSize: 11 },
  ]);

  const docDefinition: any = {
    content: [
      // Header
      {
        columns: [
          {
            text: 'TAX INVOICE',
            style: 'heading',
            width: '*',
          },
          {
            text: data.invoiceNumber,
            style: 'invoiceNumber',
            width: 'auto',
          },
        ],
        marginBottom: 8,
      },
      {
        columns: [
          { text: `Date: ${format(new Date(data.invoiceDate + 'T00:00:00'), 'dd MMM yyyy')}`, fontSize: 9, color: '#666' },
          { text: `Due: ${format(new Date(data.dueDate + 'T00:00:00'), 'dd MMM yyyy')}`, fontSize: 9, color: '#666', alignment: 'right' },
        ],
        marginBottom: 20,
      },

      // Parties
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'FROM', style: 'sectionLabel' },
              { text: data.seller.name, bold: true, fontSize: 10 },
              data.seller.gstin ? { text: `GSTIN: ${data.seller.gstin}`, fontSize: 8, color: '#666', margin: [0, 2, 0, 0] } : '',
              data.seller.address ? { text: data.seller.address, fontSize: 8, color: '#666', margin: [0, 2, 0, 0] } : '',
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'TO', style: 'sectionLabel' },
              { text: data.buyer.name, bold: true, fontSize: 10 },
              data.buyer.gstin ? { text: `GSTIN: ${data.buyer.gstin}`, fontSize: 8, color: '#666', margin: [0, 2, 0, 0] } : '',
              data.buyer.address ? { text: data.buyer.address, fontSize: 8, color: '#666', margin: [0, 2, 0, 0] } : '',
            ],
          },
        ],
        marginBottom: 20,
      },

      // Line items table
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto'],
          body: rows,
        },
        layout: {
          hLineWidth: (i: number) => (i === 0 || i === 1 || i === rows.length) ? 1 : 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#E2E5EF',
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        marginBottom: 16,
      },

      // Supply type note
      {
        text: `Supply type: ${gst.supplyType === 'intrastate' ? 'Intrastate (CGST + SGST)' : 'Interstate (IGST)'}`,
        fontSize: 8,
        color: '#999',
        marginBottom: 8,
      },

      // Notes
      data.notes ? {
        stack: [
          { text: 'Notes:', style: 'sectionLabel', marginTop: 8 },
          { text: data.notes, fontSize: 9, color: '#666' },
        ],
      } : '',

      // Footer
      {
        text: 'Generated with Kcreatio',
        fontSize: 7,
        color: '#CCC',
        alignment: 'center',
        marginTop: 30,
      },
    ],
    styles: {
      heading: { fontSize: 18, bold: true, color: '#0D0F1A' },
      invoiceNumber: { fontSize: 12, bold: true, color: '#444', alignment: 'right' },
      sectionLabel: { fontSize: 7, bold: true, color: '#999', margin: [0, 0, 0, 4], characterSpacing: 1.5 },
      tableHeader: { bold: true, fontSize: 9, color: '#666', fillColor: '#F4F5F8' },
    },
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
    },
    pageMargins: [40, 40, 40, 40],
  };

  return new Promise((resolve, reject) => {
    try {
      const pdf = pdfMake.createPdf(docDefinition);
      pdf.getBuffer((buffer: Buffer) => resolve(buffer));
    } catch (err) {
      reject(err);
    }
  });
}
