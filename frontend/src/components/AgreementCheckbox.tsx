import { useState } from 'react';
import { Modal } from './Modal';

interface AgreementCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function AgreementCheckbox({ id, checked, onChange }: AgreementCheckboxProps) {
  const [agreementOpen, setAgreementOpen] = useState(false);

  return (
    <>
      <div className="flex items-start gap-3 text-sm text-muted">
        <input
          id={id}
          name="agreement"
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-labelledby={`${id}-label`}
          required
          className="mt-0.5 h-4 w-4 shrink-0 accent-teal-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-deep"
        />
        <span id={`${id}-label`}>
          <label htmlFor={id} className="cursor-pointer">Я принимаю</label>{' '}
          <button
            type="button"
            className="text-teal-deep underline underline-offset-2 hover:no-underline"
            aria-haspopup="dialog"
            onClick={() => setAgreementOpen(true)}
          >
            пользовательское соглашение
          </button>
        </span>
      </div>
      <Modal
        open={agreementOpen}
        onClose={() => setAgreementOpen(false)}
        title="Пользовательское соглашение"
        footer={
          <button type="button" className="btn-secondary" onClick={() => setAgreementOpen(false)}>
            Закрыть
          </button>
        }
      >
        <p>Текст пользовательского соглашения будет добавлен позже.</p>
      </Modal>
    </>
  );
}

