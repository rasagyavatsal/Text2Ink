import { 
  paginate, 
  type PaginationRequest 
} from '../lib/pagination';

type PaginationWorkerScope = {
  onmessage: ((event: MessageEvent<PaginationRequest>) => void) | null;
  postMessage: (message: ReturnType<typeof paginate>) => void;
};

const workerScope = globalThis as unknown as PaginationWorkerScope;

workerScope.onmessage = (ev: MessageEvent<PaginationRequest>) => {
  const msg = ev.data;
  if (msg?.type !== 'paginate') return;

  const res = paginate(msg);
  workerScope.postMessage(res);
};
