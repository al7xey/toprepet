import { useState } from 'react';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import { AppLayout } from '../../layout/layouts';
import {
  Card,
  EmptyState,
  FilePick,
  FormError,
  PageHeader,
  QueryView,
  Status,
  TextField,
} from '../../ui';

const labels = {
  uploaded: 'Загружен',
  checking: 'На проверке',
  approved: 'Проверен',
  rejected: 'Отклонён',
};
export default function DocumentsPage() {
  const [title, setTitle] = useState('');
  const docs = useQuery('documents', () => api.listDocuments());
  const upload = useMutation((file: File) =>
    api.uploadDocument(
      title.trim() || file.name.replace(/\.[^.]+$/, '') || 'Документ',
      file,
    ),
  );
  return (
    <AppLayout role="tutor">
      <PageHeader
        title="Документы"
        back={{ to: '/tutor/profile', label: 'Анкета' }}
      />
      <Card>
        <div className="trk-form">
          <p>
            Загрузите дипломы и сертификаты. Файлы доступны только вам и
            администратору. PDF, JPG, PNG или WebP, до 10 МБ.
          </p>
          <TextField
            label="Название документа (необязательно)"
            name="documentTitle"
          autoComplete="off"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            placeholder="Например, диплом…"
          />
          <FilePick
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            loading={upload.pending}
            onPick={async (file) => {
              if (await upload.run(file)) {
                setTitle('');
                docs.reload();
              }
            }}
          >
            Загрузить документ
          </FilePick>
          <FormError error={upload.error} />
        </div>
      </Card>
      <QueryView
        query={docs}
        empty={(items) =>
          items.length ? null : (
            <EmptyState
              icon="doc"
              title="Документов нет"
              text="Добавьте документ об образовании или квалификации."
            />
          )
        }
      >
        {(items) => (
          <div className="trk-list">
            {items.map((doc) => (
              <Card key={doc.id}>
                <b>{doc.title}</b>
                <p>
                  <Status
                    tone={
                      doc.status === 'approved'
                        ? 'ok'
                        : doc.status === 'rejected'
                          ? 'bad'
                          : 'wait'
                    }
                  >
                    {labels[doc.status]}
                  </Status>
                </p>
                {doc.downloadUrl && (
                  <a
                    href={doc.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Скачать документ
                  </a>
                )}
              </Card>
            ))}
          </div>
        )}
      </QueryView>
    </AppLayout>
  );
}
