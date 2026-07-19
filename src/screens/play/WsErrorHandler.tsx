import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  START_ERROR_TEXT,
  clearPlayerSession,
  findStoredSession,
  useGame,
} from '../../shared/game';
import { useToast } from '../../shared/ui';

/**
 * The last-resort protocol error map (task 0070). Screens that initiated an
 * event intercept their own codes first (they register later, so the store
 * checks them first); whatever falls through lands here and always turns
 * into a concrete UI action - never a silent hang, never a crash.
 *
 * Registered exactly once: the current roomId is read through a ref so the
 * interceptor never re-registers and stays at the bottom of the stack.
 */
export function WsErrorHandler() {
  const game = useGame();
  const navigate = useNavigate();
  const { toast } = useToast();
  const roomIdRef = useRef<string | null>(null);
  roomIdRef.current = game.room?.roomId ?? null;

  useEffect(() => {
    return game.interceptErrors((wsError) => {
      const toJoinPage = (wipeSession: boolean) => {
        const roomId = roomIdRef.current ?? findStoredSession()?.roomId ?? null;
        if (wipeSession && roomId) clearPlayerSession(roomId);
        navigate(roomId ? `/join/${roomId}` : '/play', { replace: true });
      };

      switch (wsError.code) {
        case 'room_not_found':
          toast('Кімнати не існує або її закрито');
          toJoinPage(false);
          break;
        case 'room_not_waiting':
          toast('Гра вже почалася — приєднатися можна лише до старту');
          toJoinPage(false);
          break;
        case 'not_a_member':
          toast('Ви не в цій кімнаті — приєднайтеся заново');
          toJoinPage(true);
          break;
        case 'invalid_resume_token':
          toast('Сесію не вдалося відновити — приєднайтеся заново');
          toJoinPage(true);
          break;
        case 'nickname_taken':
          toast('Це імʼя вже зайняте в кімнаті — оберіть інше');
          break;
        case 'not_host':
        case 'start_conditions_not_met':
          toast(START_ERROR_TEXT[wsError.code] ?? wsError.message);
          break;
        case 'question_finished':
          // Meaningful only inside the round screen, which intercepts it;
          // anywhere else it is stale info - swallow quietly.
          break;
        case 'invalid_payload':
          console.error('WS invalid_payload:', wsError.message);
          toast('Помилка протоколу — спробуйте ще раз');
          break;
        default:
          // Unknown code from a newer server: inform, never crash.
          toast(`Щось пішло не так (${wsError.code})`);
      }
      return true;
    });
  }, [game.interceptErrors, navigate, toast]);

  return null;
}
