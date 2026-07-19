import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';
import { ApiError, RoomsApi, saveHostNickname, saveHostToken } from '../../shared/api';
import type { BankDetailed, RoomCreated, RoomMode } from '../../shared/api';
import { Button, ErrorBox, TextField } from '../../shared/controls';
import { Modal, useToast } from '../../shared/ui';
import styles from './CreateRoomModal.module.css';

const MODE_LABELS: Record<RoomMode, string> = {
  solo: 'Solo',
  multiplayer: 'Multiplayer',
};

/** Create-room form → POST /rooms → join link for players (task 0047). */
export function CreateRoomModal({
  bank,
  onClose,
}: {
  bank: BankDetailed;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [nickname, setNickname] = useState('');
  const [mode, setMode] = useState<RoomMode>('multiplayer');
  const [questionCount, setQuestionCount] = useState(
    Math.max(1, Math.min(20, bank.readyCount)),
  );
  const [timePerQuestion, setTimePerQuestion] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<RoomCreated | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const room = await RoomsApi.create({
        bankId: bank.id,
        hostNickname: nickname.trim(),
        settings: { mode, questionCount, timePerQuestionSeconds: timePerQuestion },
      });
      saveHostToken(room.roomId, room.hostToken);
      saveHostNickname(room.roomId, nickname.trim());
      setCreated(room);
    } catch (caught) {
      if (caught instanceof ApiError && caught.statusCode === 409) {
        setError(
          `У банку лише ${bank.readyCount} запитань з прийнятими комплектами, а для гри треба ${questionCount}. ` +
            'Зменшіть кількість запитань або пройдіть модерацію комплектів.',
        );
        return;
      }
      setError(caught instanceof ApiError ? caught.message : 'Немає звʼязку з сервером');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.joinUrl);
      toast('Посилання скопійовано');
    } catch {
      toast('Не вдалося скопіювати — виділіть посилання вручну');
    }
  };

  if (created) {
    return (
      <Modal title="Кімнату створено" onClose={onClose}>
        <p className="modal-text">
          Роздайте гравцям посилання — вони приєднаються зі своїх пристроїв:
        </p>
        <div className={styles.joinRow}>
          <code className={styles.joinUrl}>{created.joinUrl}</code>
          <Button variant="purple" onClick={() => void copyLink()}>
            📋 Копіювати
          </Button>
        </div>
        <div className="modal-actions">
          <Button onClick={() => navigate('/live', { state: { roomId: created.roomId } })}>
            ▶ На екран кімнати
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Нова кімната · ${bank.name}`} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="modal-form">
        <p className="modal-text">
          Готово до гри: <b>{bank.readyCount}</b> запитань (прийняті комплекти).
        </p>

        <TextField
          autoFocus
          required
          placeholder="Ваш нікнейм у грі"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
        />

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

        <Button type="submit" disabled={busy || !nickname.trim()}>
          {busy ? 'Створення…' : 'Створити кімнату'}
        </Button>
      </form>
    </Modal>
  );
}
