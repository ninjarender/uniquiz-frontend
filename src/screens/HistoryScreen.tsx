import { useCallback, useEffect, useState } from 'react';
import { ApiError, GameResultsApi } from '../shared/api';
import type { GameResult, RoomMode } from '../shared/api';
import { ErrorBox } from '../shared/controls';
import styles from './HistoryScreen.module.css';
import { TeacherLayout } from './TeacherLayout';

const MODE_LABELS: Record<RoomMode, string> = {
  solo: 'Solo',
  multiplayer: 'Multiplayer',
};

const MEDALS = ['🥇', '🥈', '🥉'];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatAvg = (ms: number | undefined) =>
  ms === undefined ? '—' : `${(ms / 1000).toFixed(1)} с`;

/** Host's game history: finished games with final leaderboards (task 0050). */
export function HistoryScreen() {
  const [games, setGames] = useState<GameResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const reload = useCallback(() => {
    setError(null);
    GameResultsApi.list()
      .then(setGames)
      .catch((caught: unknown) => {
        setError(
          caught instanceof ApiError ? caught.message : 'Немає звʼязку з сервером',
        );
      });
  }, []);

  useEffect(reload, [reload]);

  return (
    <TeacherLayout>
      <div className={styles.content}>
        <h2 className={styles.title}>Історія ігор</h2>

        {error && (
          <div className={styles.errorWrap}>
            <ErrorBox>
              {error} ·{' '}
              <button type="button" className={styles.retryBtn} onClick={reload}>
                повторити
              </button>
            </ErrorBox>
          </div>
        )}
        {!error && games === null && (
          <div className={styles.loading}>Завантаження історії…</div>
        )}

        {games !== null && games.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🏆</div>
            <div className={styles.emptyTitle}>Поки що жодної зіграної гри</div>
            <div className={styles.emptyText}>
              Створіть кімнату з банку запитань, проведіть гру — і її підсумки
              зʼявляться тут.
            </div>
          </div>
        )}

        {games !== null && games.length > 0 && (
          <div className={styles.list}>
            {games.map((game) => {
              const expanded = expandedId === game.id;
              return (
                <div key={game.id} className={styles.game}>
                  <button
                    type="button"
                    data-ripple
                    className={styles.gameRow}
                    onClick={() => setExpandedId(expanded ? null : game.id)}
                  >
                    <div className={styles.gameMain}>
                      <div className={styles.gameBank}>
                        {game.bankName ?? 'Банк видалено'}
                      </div>
                      <div className={styles.gameMeta}>
                        {formatDate(game.finishedAt)} · {MODE_LABELS[game.mode]} ·{' '}
                        {game.questionCount} запитань ·{' '}
                        гравців: {game.leaderboard.length}
                      </div>
                    </div>
                    <span className={styles.chevron}>{expanded ? '▴' : '▾'}</span>
                  </button>

                  {expanded && (
                    <table className={styles.board}>
                      <thead>
                        <tr>
                          <th className={styles.thPlace}>#</th>
                          <th>Гравець</th>
                          <th className={styles.thNum}>Бали</th>
                          <th className={styles.thNum}>Правильних</th>
                          <th className={styles.thNum}>Сер. час</th>
                        </tr>
                      </thead>
                      <tbody>
                        {game.leaderboard.map((entry, index) => (
                          <tr
                            key={entry.nickname}
                            className={index === 0 ? styles.rowLeader : ''}
                          >
                            <td className={styles.thPlace}>
                              {MEDALS[index] ?? index + 1}
                            </td>
                            <td>{entry.nickname}</td>
                            <td className={styles.thNum}>{entry.totalScore}</td>
                            <td className={styles.thNum}>
                              {entry.correctAnswers} / {game.questionCount}
                            </td>
                            <td className={styles.thNum}>{formatAvg(entry.avgResponseMs)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}
