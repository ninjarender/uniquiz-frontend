import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, RoomsApi } from '../../shared/api';
import type { RoomMode, RoomPublicInfo, RoomSettings } from '../../shared/api';
import { Button, ErrorBox, TextField } from '../../shared/controls';
import { Modal } from '../../shared/ui';
import styles from './RoomSettingsModal.module.css';

const MODE_LABELS: Record<RoomMode, string> = {
  solo: 'Solo',
  multiplayer: 'Multiplayer',
};

/** Host edit of room settings while it is waiting → PATCH /rooms/{roomId} (task 0049). */
export function RoomSettingsModal({
  roomId,
  settings,
  onClose,
  onSaved,
  onConflict,
}: {
  roomId: string;
  settings: RoomSettings;
  onClose: () => void;
  /** Fresh public info after a successful PATCH. */
  onSaved: (info: RoomPublicInfo) => void;
  /** 409 — the room is no longer waiting. */
  onConflict: () => void;
}) {
  const [mode, setMode] = useState<RoomMode>(settings.mode);
  const [questionCount, setQuestionCount] = useState(settings.questionCount);
  const [timePerQuestion, setTimePerQuestion] = useState(settings.timePerQuestionSeconds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const info = await RoomsApi.updateSettings(roomId, {
        mode,
        questionCount,
        timePerQuestionSeconds: timePerQuestion,
      });
      onSaved(info);
    } catch (caught) {
      if (caught instanceof ApiError && caught.statusCode === 409) {
        onConflict();
        return;
      }
      setError(caught instanceof ApiError ? caught.message : 'Немає звʼязку з сервером');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Налаштування кімнати" onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="modal-form">
        <div className={styles.modeRow}>
          {(Object.keys(MODE_LABELS) as RoomMode[]).map((option) => (
            <button
              key={option}
              type="button"
              data-ripple
              className={`${styles.modeBtn} ${mode === option ? styles.modeBtnActive : ''}`}
              onClick={() => setMode(option)}
            >
              {MODE_LABELS[option]}
            </button>
          ))}
        </div>

        <label className={styles.numberRow}>
          <span>Запитань у грі</span>
          <TextField
            type="number"
            min={1}
            required
            className={styles.numberInput}
            value={questionCount}
            onChange={(event) => setQuestionCount(Number(event.target.value))}
          />
        </label>
        <label className={styles.numberRow}>
          <span>Секунд на запитання</span>
          <TextField
            type="number"
            min={5}
            required
            className={styles.numberInput}
            value={timePerQuestion}
            onChange={(event) => setTimePerQuestion(Number(event.target.value))}
          />
        </label>

        {error && <ErrorBox>{error}</ErrorBox>}

        <Button type="submit" disabled={busy}>
          {busy ? 'Збереження…' : 'Зберегти'}
        </Button>
      </form>
    </Modal>
  );
}
