import jsPDF from 'jspdf';

let pdf: jsPDF | null = null;

type PdfOrientation = 'portrait' | 'landscape' | 'p' | 'l';

type PdfWorkerRequest =
  | {
      type: 'init';
      payload: {
        orientation: PdfOrientation;
        width: number;
        height: number;
      };
    }
  | {
      type: 'addPage';
      payload: {
        imgData: Uint8Array | ArrayBuffer;
        width: number;
        height: number;
        orientation: PdfOrientation;
        isFirstPage: boolean;
      };
    }
  | { type: 'generate' }
  | { type: 'cleanup' };

type PdfWorkerResponse =
  | { type: 'initialized' }
  | { type: 'pageAdded' }
  | { type: 'generated'; payload: ArrayBuffer }
  | { type: 'error'; payload: string };

type PdfWorkerScope = {
  onmessage: ((event: MessageEvent<PdfWorkerRequest>) => void | Promise<void>) | null;
  postMessage: (message: PdfWorkerResponse, transfer?: Transferable[]) => void;
};

const workerScope = globalThis as unknown as PdfWorkerScope;

function postWorkerMessage(message: PdfWorkerResponse, transfer: Transferable[] = []) {
  workerScope.postMessage(message, transfer);
}

workerScope.onmessage = async (event: MessageEvent<PdfWorkerRequest>) => {
  const message = event.data;

  switch (message.type) {
    case 'init': {
      const { orientation, width, height } = message.payload;
      pdf = new jsPDF({
        orientation,
        unit: 'pt',
        format: [width, height],
      });
      postWorkerMessage({ type: 'initialized' });
      break;
    }

    case 'addPage': {
      if (!pdf) {
        postWorkerMessage({ type: 'error', payload: 'PDF not initialized' });
        return;
      }

      const { imgData, width, height, orientation, isFirstPage } = message.payload;

      if (!isFirstPage) {
        pdf.addPage([width, height], orientation);
      }

      // Use 'FAST' compression for speed
      const data = imgData instanceof ArrayBuffer ? new Uint8Array(imgData) : imgData;
      pdf.addImage(data, 'PNG', 0, 0, width, height, undefined, 'FAST');

      postWorkerMessage({ type: 'pageAdded' });
      break;
    }

    case 'generate': {
      if (!pdf) {
        postWorkerMessage({ type: 'error', payload: 'PDF not initialized' });
        return;
      }

      const output = pdf.output('arraybuffer');
      postWorkerMessage({ type: 'generated', payload: output }, [output]);
      break;
    }

    case 'cleanup': {
      pdf = null;
      break;
    }
  }
};
