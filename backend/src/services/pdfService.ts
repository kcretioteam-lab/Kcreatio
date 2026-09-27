import pdfMake from 'pdfmake/build/pdfmake.js';
import vfsFonts from 'pdfmake/build/vfs_fonts.js';
import { format } from 'date-fns';
import { GstCalculation, CREATOR_GST_CONFIG } from './invoiceService.js';
import { amountInWords } from './puppeteerPdfService.js';

// Fallback renderer, used when Puppeteer can't start Chrome. Fonts come from pdfmake's bundled
// virtual file system — without it every render fails with "Roboto-Medium.ttf not found".
const FONTS = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
};
pdfMake.addVirtualFileSystem(vfsFonts);
pdfMake.setFonts(FONTS);

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
  sacCode?: string;
  reverseCharge?: string;
  gst: Omit<GstCalculation, 'discountAmount' | 'lines'>;
  notes?: string;
  plan?: string;
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
      data.sacCode || CREATOR_GST_CONFIG.hsnCode,
      { text: `₹${gst.baseAmount.toLocaleString('en-IN')}`, alignment: 'right' },
    ],
  ];

  if (gst.supplyType === 'intrastate') {
    rows.push(
      [{ text: `Add: CGST @ ${gst.gstRate / 2}%`, colSpan: 2 }, '', { text: `₹${gst.cgstAmount!.toLocaleString('en-IN')}`, alignment: 'right' }],
      [{ text: `Add: SGST @ ${gst.gstRate / 2}%`, colSpan: 2 }, '', { text: `₹${gst.sgstAmount!.toLocaleString('en-IN')}`, alignment: 'right' }]
    );
  } else {
    rows.push(
      [{ text: `Add: IGST @ ${gst.gstRate}%`, colSpan: 2 }, '', { text: `₹${gst.igstAmount!.toLocaleString('en-IN')}`, alignment: 'right' }]
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
              data.seller.stateCode ? { text: `State Code: ${data.seller.stateCode}`, fontSize: 8, color: '#666', margin: [0, 2, 0, 0] } : '',
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'TO', style: 'sectionLabel' },
              { text: data.buyer.name, bold: true, fontSize: 10 },
              data.buyer.gstin ? { text: `GSTIN: ${data.buyer.gstin}`, fontSize: 8, color: '#666', margin: [0, 2, 0, 0] } : '',
              data.buyer.address ? { text: data.buyer.address, fontSize: 8, color: '#666', margin: [0, 2, 0, 0] } : '',
              data.buyer.stateCode ? { text: `State Code: ${data.buyer.stateCode}`, fontSize: 8, color: '#666', margin: [0, 2, 0, 0] } : '',
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

      // Rule 46: amount in words and an explicit reverse-charge statement
      { text: `Amount chargeable (in words): ${amountInWords(gst.totalAmount)}`, fontSize: 9, marginBottom: 4 },
      { text: `Tax payable on reverse charge: ${data.reverseCharge === 'Yes' ? 'Yes' : 'No'}`, fontSize: 9, marginBottom: 8 },

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
        text: 'Computer-generated invoice · Kcreatio · Subject to GST as applicable',
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

  // Basic plan: same watermark as the Puppeteer renderer
  if (data.plan === 'basic') {
    docDefinition.watermark = { text: 'Kcreatio', color: '#718096', opacity: 0.07, bold: true, angle: -45 };
    docDefinition.footer = { text: 'Made with ease on kcreatio.com', fontSize: 8, color: '#a0aec0', alignment: 'center', margin: [0, 10, 0, 0] };
  }

  // pdfmake 0.3 returns a promise here (it no longer takes a callback). Awaiting it keeps render
  // errors inside the request — a rejected promise nobody awaited used to crash the whole process.
  return (async () => {
    const buffer = await pdfMake.createPdf(docDefinition).getBuffer();
    return Buffer.from(buffer);
  })();
}
