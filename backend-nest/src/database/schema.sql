CREATE TABLE IF NOT EXISTS work_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('feature','bug','improvement','maintenance')),
  status TEXT NOT NULL CHECK (status IN ('backlog','planned','in_progress','qa','ready_for_release','released')) DEFAULT 'backlog',
  priority TEXT NOT NULL CHECK (priority IN ('low','medium','high','urgent')),
  assignee TEXT,
  due_date DATE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qa_checks (
  id TEXT PRIMARY KEY,
  work_item_id TEXT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  test_title TEXT NOT NULL,
  expected_result TEXT NOT NULL,
  actual_result TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending','passed','failed')) DEFAULT 'pending',
  tester TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS releases (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  release_date DATE,
  summary TEXT,
  deployment_status TEXT NOT NULL CHECK (deployment_status IN ('draft','scheduled','deployed','rolled_back')) DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS release_work_items (
  release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  work_item_id TEXT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (release_id, work_item_id)
);

CREATE TABLE IF NOT EXISTS work_item_history (
  id TEXT PRIMARY KEY,
  work_item_id TEXT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS score_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  points INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (action, entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS qa_check_history (
  id TEXT PRIMARY KEY,
  qa_check_id TEXT NOT NULL REFERENCES qa_checks(id) ON DELETE CASCADE,
  work_item_id TEXT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  test_title TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);