import { 
  paginate, 
  type PaginationRequest 
} from '../lib/pagination';

self.onmessage = (ev: MessageEvent<PaginationRequest>) => {
  const msg = ev.data;
  if (!msg || msg.type !== 'paginate') return;

  const res = paginate(msg);
  self.postMessage(res);
};
