import { 
  paginate, 
  type PaginationRequest 
} from '../lib/pagination';

type PaginationWorkerScope = {
  postMessage: (message: unknown) => void;
  onmessage: ((ev: MessageEvent<PaginationRequest>) => void) | null;
};

const workerScope = self as unknown as PaginationWorkerScope;

workerScope.onmessage = (ev: MessageEvent<PaginationRequest>) => {
  const msg = ev.data;
  if (!msg || msg.type !== 'paginate') return;

  const res = paginate(msg);
  workerScope.postMessage(res);
};
