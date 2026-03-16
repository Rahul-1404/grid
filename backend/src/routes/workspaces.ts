import { Router, type Request, type Response } from 'express';
import { getAllDocs, getDoc } from '../doc-store.js';

const router = Router();

const workspaces = [
  { id: 'ws-1', name: 'Grid Project', icon: '🔮' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json(workspaces.map((ws) => ({
    ...ws,
    documentCount: getAllDocs(ws.id).length,
  })));
});

router.get('/:id/documents', (req: Request, res: Response) => {
  const ws = workspaces.find((w) => w.id === req.params.id);
  if (!ws) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }
  const docs = getAllDocs(ws.id).map((d) => ({
    id: d.id,
    title: d.title,
    icon: d.icon,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }));
  res.json(docs);
});

router.get('/:id/documents/:docId', (req: Request, res: Response) => {
  const doc = getDoc(req.params.docId as string);
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  res.json(doc);
});

export default router;
