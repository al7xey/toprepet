import { api } from '../../api';
import { useMutation } from '../../api/hooks';
import type { TutorDocument } from '../../api/types';
import { Button, FormError } from '../../ui';

export function Document({
  document: doc,
  onModerated,
}: {
  document: TutorDocument;
  onModerated: (doc: TutorDocument) => void;
}) {
  const action = useMutation((approve: boolean) =>
    api.adminModerateDocument(doc.id, approve),
  );
  const decide = async (approve: boolean) => {
    const next = await action.run(approve);
    if (next) onModerated(next);
  };
  return (
    <div className="g8">
      <b>{doc.title}</b>
      {doc.downloadUrl && (
        <a href={doc.downloadUrl} target="_blank" rel="noopener noreferrer">
          Скачать документ
        </a>
      )}
      <span className="muted">
        {doc.status === 'checking'
          ? 'Ожидает проверки'
          : doc.status === 'approved'
            ? 'Проверен'
            : 'Отклонён'}
      </span>
      {doc.status === 'checking' && doc.downloadUrl && (
        <div className="trk-actions">
          <Button
            size="s"
            loading={action.pending}
            onClick={() => void decide(true)}
          >
            Подтвердить документ
          </Button>
          <Button
            size="s"
            variant="line"
            disabled={action.pending}
            onClick={() => void decide(false)}
          >
            Отклонить документ
          </Button>
        </div>
      )}
      <FormError error={action.error} />
    </div>
  );
}
