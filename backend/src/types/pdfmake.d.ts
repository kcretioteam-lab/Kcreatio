// pdfmake 0.3 API — getBuffer() returns a promise (it no longer takes a callback)
declare module 'pdfmake/build/pdfmake.js' {
  const pdfMake: {
    createPdf: (docDefinition: any) => {
      getBuffer: () => Promise<Buffer | Uint8Array>;
      download: (filename?: string) => void;
    };
    addVirtualFileSystem: (vfs: Record<string, string>) => void;
    setFonts: (fonts: Record<string, any>) => void;
    fonts: Record<string, any>;
  };
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts.js' {
  const vfs: Record<string, string>;
  export default vfs;
}
