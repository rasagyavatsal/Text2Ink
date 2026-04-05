import jsPDF from 'jspdf';

let pdf: jsPDF | null = null;

self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'init': {
      const { orientation, unit, format } = payload;
      pdf = new jsPDF({
        orientation,
        unit,
        format,
      });
      self.postMessage({ type: 'initialized' });
      break;
    }

    case 'addPage': {
      if (!pdf) {
        self.postMessage({ type: 'error', payload: 'PDF not initialized' });
        return;
      }
      const { imgData, width, height, isFirstPage } = payload;
      
      if (!isFirstPage) {
        pdf.addPage();
      }
      
      // Use 'FAST' compression for speed
      const data = imgData instanceof ArrayBuffer ? new Uint8Array(imgData) : imgData;
      pdf.addImage(data, 'PNG', 0, 0, width, height, undefined, 'FAST');
      
      self.postMessage({ type: 'pageAdded' });
      break;
    }

    case 'generate': {
      if (!pdf) {
        self.postMessage({ type: 'error', payload: 'PDF not initialized' });
        return;
      }
      
      const output = pdf.output('arraybuffer');
      self.postMessage({ type: 'generated', payload: output }, [output]);
      break;
    }
    
    case 'cleanup': {
      pdf = null;
      break;
    }
  }
};
