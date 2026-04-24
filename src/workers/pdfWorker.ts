import jsPDF from 'jspdf';

let pdf: jsPDF | null = null;

type PdfInitPayload = {
  orientation: 'portrait' | 'landscape';
  unit: 'pt' | 'mm' | 'cm' | 'in' | 'px';
  format: 'letter' | [number, number];
};

type AddPagePayload = {
  imgData: ArrayBuffer | Uint8Array;
  width: number;
  height: number;
  isFirstPage: boolean;
};

type PdfWorkerRequest =
  | { type: 'init'; payload: PdfInitPayload }
  | { type: 'addPage'; payload: AddPagePayload }
  | { type: 'generate' }
  | { type: 'cleanup' };

type PdfWorkerResponse =
  | { type: 'initialized' }
  | { type: 'pageAdded' }
  | { type: 'generated'; payload: ArrayBuffer }
  | { type: 'error'; payload: string };

type PdfWorkerScope = {
  postMessage: (message: PdfWorkerResponse, transfer?: Transferable[]) => void;
  onmessage: ((event: MessageEvent<PdfWorkerRequest>) => Promise<void>) | null;
};

const workerScope = self as unknown as PdfWorkerScope;

workerScope.onmessage = async (event: MessageEvent<PdfWorkerRequest>) => {
  const message = event.data;

  switch (message.type) {
    case 'init': {
      const { orientation, unit, format } = message.payload;
      pdf = new jsPDF({
        orientation,
        unit,
        format,
      });
      const response: PdfWorkerResponse = { type: 'initialized' };
      workerScope.postMessage(response);
      break;
    }

    case 'addPage': {
      if (!pdf) {
        const errorResponse: PdfWorkerResponse = {
          type: 'error',
          payload: 'PDF not initialized',
        };
        workerScope.postMessage(errorResponse);
        return;
      }
      const { imgData, width, height, isFirstPage } = message.payload;
      
      if (!isFirstPage) {
        pdf.addPage();
      }
      
      // Use 'FAST' compression for speed
      const data = imgData instanceof ArrayBuffer ? new Uint8Array(imgData) : imgData;
      pdf.addImage(data, 'PNG', 0, 0, width, height, undefined, 'FAST');
      
      const response: PdfWorkerResponse = { type: 'pageAdded' };
      workerScope.postMessage(response);
      break;
    }

    case 'generate': {
      if (!pdf) {
        const errorResponse: PdfWorkerResponse = {
          type: 'error',
          payload: 'PDF not initialized',
        };
        workerScope.postMessage(errorResponse);
        return;
      }
      
      const output = pdf.output('arraybuffer') as ArrayBuffer;
      const response: PdfWorkerResponse = { type: 'generated', payload: output };
      workerScope.postMessage(response, [output]);
      break;
    }
    
    case 'cleanup': {
      pdf = null;
      break;
    }
  }
};
