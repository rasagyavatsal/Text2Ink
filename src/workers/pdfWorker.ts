import jsPDF from 'jspdf';

let pdf: jsPDF | null = null;

self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'init': {
      const { orientation, width, height } = payload;
      pdf = new jsPDF({
        orientation,
        unit: 'pt',
        format: [width, height],
      });
      (self as any).postMessage({ type: 'initialized' });
      break;
    }

    case 'addPage': {
      if (!pdf) {
        (self as any).postMessage({ type: 'error', payload: 'PDF not initialized' });
        return;
      }
      const { imgData, width, height, orientation, isFirstPage } = payload;
      
      if (!isFirstPage) {
        pdf.addPage([width, height], orientation);
      }
      
      // Use 'FAST' compression for speed
      const data = imgData instanceof ArrayBuffer ? new Uint8Array(imgData) : imgData;
      pdf.addImage(data, 'PNG', 0, 0, width, height, undefined, 'FAST');
      
      (self as any).postMessage({ type: 'pageAdded' });
      break;
    }

    case 'generate': {
      if (!pdf) {
        (self as any).postMessage({ type: 'error', payload: 'PDF not initialized' });
        return;
      }
      
      const output = pdf.output('arraybuffer');
      (self as any).postMessage({ type: 'generated', payload: output }, [output]);
      break;
    }
    
    case 'cleanup': {
      pdf = null;
      break;
    }
  }
};
