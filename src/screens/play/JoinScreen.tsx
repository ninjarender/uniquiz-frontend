import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';
import { useDemoGame } from '../../demo/engine';
import { Button, TextField } from '../../shared/controls';
import { FloatingShapes, Logo } from '../../shared/ui';
import type { ShapeSpec } from '../../shared/ui';
import styles from './JoinScreen.module.css';

const JOIN_SHAPES: ShapeSpec[] = [
  { glyph: '▲', size: 64, top: '7%', left: '8%', spin: true },
  { glyph: '◆', size: 36, top: '24%', right: '10%' },
  { glyph: '●', size: 52, bottom: '20%', left: '9%' },
  { glyph: '■', size: 44, bottom: '8%', right: '12%', spin: true, delay: 2 },
];

/** D2 - joining a session: room code + nickname (demo engine). */
export function JoinScreen() {
  const { join } = useDemoGame();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    join(code.trim() || '482 913', name.trim() || 'Гість');
    navigate('/play/lobby');
  };

  return (
    <div className={`grad-bg ${styles.screen}`}>
      <FloatingShapes shapes={JOIN_SHAPES} />
      <Logo />
      <div className={styles.tagline}>Введіть код кімнати та ваше імʼя</div>

      <form className={styles.card} onSubmit={submit}>
        <TextField
          className={styles.codeField}
          placeholder="Код кімнати"
          autoFocus
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <TextField
          className={styles.nameField}
          placeholder="Ваше імʼя"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button type="submit">▶ Приєднатися</Button>
        <div className={styles.note}>Код показує хост — на екрані чи проєкторі</div>
      </form>

      <div className={styles.demoBadge}>
        Демо-режим · кімнати підключаться з бекендом (0018+)
      </div>
    </div>
  );
}
