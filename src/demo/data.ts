/**
 * Demo question bank (from the interactive prototype, "Databases" course).
 * Used by the mock game engine until backend rooms/WS (tasks 0018+) land.
 */
export interface DemoQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  /** Plausible extra distractor - replaces the correct option in the trap version. */
  spare: string;
  explanation: string;
}

export const DEMO_BANK_NAME = 'Бази даних — Модуль 1';

export const DEMO_BANK: DemoQuestion[] = [
  {
    text: 'Яка нормальна форма вимагає відсутності транзитивних залежностей неключових атрибутів?',
    options: ['Перша нормальна форма (1НФ)', 'Друга нормальна форма (2НФ)', 'Третя нормальна форма (3НФ)', 'Нормальна форма Бойса — Кодда'],
    correctIndex: 2,
    spare: 'Четверта нормальна форма (4НФ)',
    explanation: '3НФ вимагає, щоб неключові атрибути залежали лише від ключа, без транзитивних залежностей.',
  },
  {
    text: 'Що поверне SELECT COUNT(*) FROM a LEFT JOIN b ON a.id=b.a_id, якщо в b немає жодного збігу?',
    options: ['Кількість рядків таблиці a', '0', 'NULL', 'Помилку виконання'],
    correctIndex: 0,
    spare: 'Кількість рядків таблиці b',
    explanation: 'LEFT JOIN зберігає всі рядки лівої таблиці, доповнюючи їх NULL; COUNT(*) рахує всі рядки результату.',
  },
  {
    text: 'Основне призначення індексу B-tree у СУБД?',
    options: ['Пришвидшення пошуку та сортування за ключем', 'Стиснення даних на диску', 'Забезпечення цілісності транзакцій', 'Шифрування вмісту таблиці'],
    correctIndex: 0,
    spare: 'Кешування результатів запитів',
    explanation: 'B-tree-індекс дає логарифмічний пошук за значенням ключа і підтримує діапазонні запити.',
  },
  {
    text: 'Який рівень ізоляції транзакцій допускає фантомні читання?',
    options: ['SERIALIZABLE', 'REPEATABLE READ (стандарт SQL)', 'READ COMMITTED', 'Жоден із наведених'],
    correctIndex: 2,
    spare: 'SNAPSHOT ISOLATION',
    explanation: 'READ COMMITTED захищає лише від брудного читання; фантоми і неповторювані читання можливі.',
  },
  {
    text: 'Чим TRUNCATE відрізняється від DELETE без WHERE?',
    options: ['TRUNCATE скидає таблицю миттєво, без построкового журналювання', 'Нічим, це синоніми', 'DELETE працює швидше на великих таблицях', 'TRUNCATE видаляє і саму таблицю'],
    correctIndex: 0,
    spare: 'TRUNCATE можна відкотити в будь-якій СУБД',
    explanation: 'TRUNCATE — DDL-операція, що звільняє сторінки даних одразу; DELETE журналює кожен рядок.',
  },
  {
    text: 'Що гарантує зовнішній ключ (FOREIGN KEY)?',
    options: ['Посилальну цілісність між таблицями', 'Унікальність значень у стовпці', 'Автоматичну індексацію таблиці', 'Швидший JOIN'],
    correctIndex: 0,
    spare: 'Каскадне резервне копіювання',
    explanation: 'FK гарантує, що значення посилається на наявний рядок батьківської таблиці.',
  },
  {
    text: 'Яка властивість ACID гарантує, що завершена транзакція не зникне після збою?',
    options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
    correctIndex: 3,
    spare: 'Persistence',
    explanation: 'Durability (довговічність): підтверджені зміни зберігаються навіть після відмови системи.',
  },
  {
    text: 'Для чого потрібен GROUP BY?',
    options: ['Групувати рядки для агрегатних функцій', 'Сортувати результат', "Об'єднувати таблиці", 'Обмежувати кількість рядків'],
    correctIndex: 0,
    spare: 'Фільтрувати рядки до агрегації',
    explanation: 'GROUP BY утворює групи рядків, до яких застосовуються COUNT, SUM, AVG тощо.',
  },
  {
    text: 'Що таке денормалізація?',
    options: ['Свідоме додавання надлишковості для швидкості читання', 'Видалення індексів', 'Розбиття таблиці на дрібніші', 'Помилка проєктування, якої слід уникати завжди'],
    correctIndex: 0,
    spare: 'Автоматичне стискання таблиць',
    explanation: 'Денормалізація — компроміс: дублювання даних заради меншої кількості JOIN при читанні.',
  },
  {
    text: 'Який оператор поверне рядки, наявні в обох вибірках?',
    options: ['INTERSECT', 'UNION', 'EXCEPT', 'CROSS JOIN'],
    correctIndex: 0,
    spare: 'INNER MERGE',
    explanation: 'INTERSECT повертає перетин двох множин рядків.',
  },
];

export const BOT_NAMES = ['Марина К.', 'Олег В.', 'Ірина С.', 'Тарас М.', 'Софія Д.', 'Андрій П.'];

/** Business rules (kb): questions per game, round time, score formula. */
export const QUIZ_LEN = 5;
export const ROUND_TIME_S = 20;
/** Aligned with T so the score hits 0 exactly at the timeout: 500 / 20 = 25. */
export const PENALTY_PER_S = 25;
export const MAX_SCORE = 500;

/** score = max(500 − elapsed × penalty, 0) — exact multiplication, no rounding. */
export function scoreFor(elapsedSeconds: number): number {
  return Math.max(MAX_SCORE - elapsedSeconds * PENALTY_PER_S, 0);
}
