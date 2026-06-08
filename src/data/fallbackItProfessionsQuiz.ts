import type { Quiz, QuizAnswer, QuizQuestion } from "../lib/contentTypes";

type FallbackQuizQuestion = QuizQuestion & { answers: QuizAnswer[] };

const questionSeeds = [
  ["role", "frontend", "easy", ["frontend", "ui"], "Хто в ІТ-команді найчастіше відповідає за видиму частину сайту?", ["Frontend-розробник", "Системний адміністратор", "DevOps Engineer", "Database Specialist"], 0, "Frontend-розробник створює інтерфейси, з якими взаємодіє користувач."],
  ["task", "frontend", "easy", ["html", "css"], "Яке завдання найближче до роботи Frontend-розробника?", ["Налаштувати маршрутизатор", "Зверстати адаптивну сторінку", "Створити резервну копію сервера", "Навчити ML-модель"], 1, "Адаптивна сторінка, HTML, CSS і поведінка інтерфейсу належать до frontend."],
  ["role", "backend", "easy", ["backend", "api"], "Хто зазвичай створює API та серверну логіку?", ["Backend-розробник", "UI/UX Designer", "Network Engineer", "Game Developer"], 0, "Backend-розробник відповідає за логіку, API, дані та серверну частину."],
  ["tool", "backend", "medium", ["api", "database"], "Що найчастіше використовує Backend-розробник?", ["SQL і серверні фреймворки", "Figma-прототипи", "HDMI-кабелі", "Текстури для персонажів"], 0, "Backend часто працює з базами даних, API та серверними фреймворками."],
  ["role", "fullstack", "easy", ["frontend", "backend"], "Хто може працювати і з інтерфейсом, і з серверною логікою?", ["Fullstack-розробник", "QA Engineer", "System Administrator", "Data Analyst"], 0, "Fullstack-розробник поєднує frontend і backend-задачі."],
  ["situation", "fullstack", "medium", ["product", "web"], "Команді потрібен прототип сайту з формою, API та базою даних. Хто може швидко зібрати все разом?", ["Fullstack-розробник", "Network Engineer", "Cybersecurity Specialist", "UI/UX Designer"], 0, "Fullstack найкраще підходить для швидкого створення повного web-прототипу."],
  ["role", "qa", "easy", ["testing", "quality"], "Хто шукає помилки й перевіряє якість продукту?", ["QA Engineer", "AI/ML Engineer", "Database Specialist", "Product Manager"], 0, "QA Engineer перевіряє сценарії, знаходить помилки та допомагає підвищити якість."],
  ["task", "qa", "medium", ["testing", "bug-report"], "Що є типовим результатом роботи QA Engineer?", ["Баг-репорт із кроками відтворення", "Логотип продукту", "Налаштований DNS", "Навчена нейромережа"], 0, "Баг-репорт описує помилку, кроки, фактичний і очікуваний результат."],
  ["role", "ux", "easy", ["design", "users"], "Хто досліджує потреби користувачів і проєктує зручність?", ["UI/UX Designer", "Backend-розробник", "DevOps Engineer", "Embedded Engineer"], 0, "UI/UX Designer думає про сценарії, зрозумілість і зручність продукту."],
  ["tool", "ux", "easy", ["figma", "prototype"], "Який інструмент найчастіше асоціюється з UI/UX-дизайном?", ["Figma", "PostgreSQL", "Wireshark", "Docker"], 0, "Figma часто використовується для макетів, прототипів і дизайн-систем."],
  ["role", "data", "easy", ["analytics", "data"], "Хто аналізує таблиці, графіки та допомагає приймати рішення на основі даних?", ["Data Analyst", "Game Developer", "Network Engineer", "System Administrator"], 0, "Data Analyst перетворює дані на висновки, звіти й візуалізації."],
  ["task", "data", "medium", ["dashboard", "sql"], "Яке завдання найближче до Data Analyst?", ["Побудувати dashboard за даними", "Намалювати іконку", "Прокласти кабель", "Налаштувати CI/CD"], 0, "Аналітик створює звіти, dashboard-и та висновки на основі даних."],
  ["role", "ai", "easy", ["ai", "machine-learning"], "Хто працює з моделями машинного навчання?", ["AI/ML Engineer", "QA Engineer", "Sysadmin", "Product Manager"], 0, "AI/ML Engineer створює, навчає та оцінює ML-моделі."],
  ["myth", "ai", "medium", ["ai", "myth"], "Яке твердження про AI/ML є міфом?", ["AI завжди сам розуміє задачу без даних", "Якість даних впливає на модель", "Модель треба тестувати", "Python часто використовують в AI"], 0, "AI не працює магічно: потрібні дані, постановка задачі й перевірка результатів."],
  ["role", "cybersecurity", "easy", ["security", "access"], "Хто відповідає за захист акаунтів, систем і даних?", ["Cybersecurity Specialist", "Frontend-розробник", "Data Analyst", "Game Developer"], 0, "Фахівець із кібербезпеки шукає ризики та захищає доступи, мережі й дані."],
  ["situation", "cybersecurity", "medium", ["passwords", "phishing"], "Користувачі отримали підозрілий лист із посиланням. Який напрям допоможе оцінити ризик?", ["Cybersecurity", "Gamedev", "UX writing", "Database indexing"], 0, "Фішинг і безпека пошти належать до кібербезпеки."],
  ["role", "devops", "easy", ["deploy", "infrastructure"], "Хто автоматизує запуск, деплой і стабільність сервісів?", ["DevOps Engineer", "UI/UX Designer", "QA Engineer", "Data Analyst"], 0, "DevOps поєднує автоматизацію, інфраструктуру, CI/CD і стабільність сервісів."],
  ["tool", "devops", "medium", ["docker", "ci-cd"], "Який інструмент часто використовує DevOps Engineer?", ["Docker", "Figma", "Scratch", "Excel для діаграм"], 0, "Docker допомагає запускати сервіси в контейнерах і є типовим DevOps-інструментом."],
  ["role", "sysadmin", "easy", ["systems", "support"], "Хто налаштовує компʼютери, доступи та робоче середовище?", ["System Administrator", "AI/ML Engineer", "Frontend-розробник", "Product Manager"], 0, "System Administrator підтримує компʼютери, облікові записи, програми й інфраструктуру."],
  ["situation", "sysadmin", "medium", ["windows", "support"], "У кабінеті не працює доступ до спільної папки. Хто найімовірніше допоможе?", ["System Administrator", "Game Developer", "Data Analyst", "UI Designer"], 0, "Доступи, робочі станції й спільні ресурси часто підтримує системний адміністратор."],
  ["role", "database", "easy", ["database", "sql"], "Хто проєктує таблиці, звʼязки та запити до даних?", ["Database Specialist", "Embedded Engineer", "Network Engineer", "QA Engineer"], 0, "Database Specialist відповідає за структуру, цілісність і ефективність роботи з даними."],
  ["task", "database", "medium", ["postgresql", "schema"], "Що найбільше схоже на задачу Database Specialist?", ["Оптимізувати SQL-запит", "Підібрати палітру кольорів", "Зробити 3D-персонажа", "Налаштувати Wi-Fi канал"], 0, "Оптимізація SQL і схема даних є типовими задачами фахівця з баз даних."],
  ["role", "network", "easy", ["network", "internet"], "Хто налаштовує мережі, маршрутизацію та зʼєднання пристроїв?", ["Network Engineer", "Frontend-розробник", "AI/ML Engineer", "Product Manager"], 0, "Network Engineer працює з мережами, IP-адресами, маршрутизацією та стабільним звʼязком."],
  ["tool", "network", "medium", ["wireshark", "protocols"], "Який інструмент допомагає аналізувати мережевий трафік?", ["Wireshark", "Figma", "Unity", "Pandas"], 0, "Wireshark використовується для перегляду пакетів і діагностики мережі."],
  ["role", "embedded", "easy", ["robotics", "hardware"], "Хто програмує пристрої, датчики або роботів?", ["Embedded/Robotics Engineer", "Data Analyst", "UI/UX Designer", "DevOps Engineer"], 0, "Embedded/Robotics Engineer пише код для пристроїв, контролерів і датчиків."],
  ["task", "embedded", "medium", ["arduino", "sensors"], "Яке завдання найближче до Embedded/Robotics Engineer?", ["Зчитати дані з датчика температури", "Створити рекламний банер", "Перевірити орфографію", "Побудувати фінансовий dashboard"], 0, "Робота з датчиками та контролерами належить до embedded/robotics."],
  ["role", "gamedev", "easy", ["games", "unity"], "Хто створює ігрову логіку, сцени та взаємодію в грі?", ["Game Developer", "Database Specialist", "Network Engineer", "Cybersecurity Specialist"], 0, "Game Developer працює з механіками, сценами, правилами гри й інтерактивністю."],
  ["tool", "gamedev", "medium", ["unity", "csharp"], "Який інструмент часто повʼязаний із GameDev?", ["Unity", "PostgreSQL", "Supabase Auth", "Cisco Packet Tracer"], 0, "Unity часто використовують для створення 2D/3D ігор і симуляцій."],
  ["role", "manager", "easy", ["product", "team"], "Хто координує команду, пріоритети та цілі продукту?", ["Product/Project Manager", "Backend-розробник", "System Administrator", "QA Engineer"], 0, "Product/Project Manager допомагає команді рухатися до цілей, узгоджує задачі та пріоритети."],
  ["situation", "manager", "medium", ["planning", "communication"], "Команда має багато ідей, але треба визначити пріоритети релізу. Хто допоможе організувати рішення?", ["Product/Project Manager", "Embedded Engineer", "Network Engineer", "Game Developer"], 0, "Менеджер допомагає визначати пріоритети, планувати роботу та синхронізувати команду."],
] as const;

export const fallbackItProfessionsQuiz: Quiz & { questions: FallbackQuizQuestion[] } = {
  id: "fallback-it-professions",
  slug: "it-professions",
  title: "Професії в ІТ",
  description: "Міні-квіз про те, хто чим займається в ІТ-команді.",
  default_question_count: 10,
  is_active: true,
  questions: questionSeeds.map((item, index) => {
    const [question_type, visual_type, difficulty, tags, question_text, answers, correctIndex, explanation] = item;
    const questionId = `fallback-it-professions-${index + 1}`;

    return {
      id: questionId,
      quiz_id: "fallback-it-professions",
      question_text,
      question_type,
      explanation,
      visual_type,
      difficulty,
      tags: [...tags],
      is_active: true,
      sort_order: index + 1,
      answers: answers.map((answer_text, answerIndex) => ({
        id: `${questionId}-answer-${answerIndex + 1}`,
        question_id: questionId,
        answer_text,
        is_correct: answerIndex === correctIndex,
        tags: [...tags],
        sort_order: answerIndex + 1,
      })),
    };
  }),
};
