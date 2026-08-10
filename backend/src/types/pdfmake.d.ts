declare module 'pdfmake/build/pdfmake.js' {
  const pdfMake: {
    createPdf: (docDefinition: any) => {
      getBuffer: (callback: (buffer: Buffer) => void) => void;
      download: (filename?: string) => void;
    };
    fonts: Record<string, any>;
  };
  export default pdfMake;
}
