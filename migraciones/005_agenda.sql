-- Agenda: horario semanal de cada psicólogo, días bloqueados y citas reservadas por pacientes.
alter table perfiles add column agenda jsonb not null default '{"bloques":[],"duracion":50,"descanso":10,"anticipacion":12,"dias":30}';

create table bloqueos (
  usuario_id int not null references usuarios(id) on delete cascade,
  fecha date not null,
  primary key (usuario_id, fecha)
);

-- los datos del paciente (nombre, contacto, motivo) van cifrados; el paciente maneja su cita con un enlace secreto
create table citas (
  id serial primary key,
  usuario_id int not null references usuarios(id) on delete cascade,
  inicio timestamptz not null,
  fin timestamptz not null,
  modalidad text not null check (modalidad in ('online', 'presencial')),
  datos bytea not null,
  token_hash text not null unique,
  estado text not null default 'confirmada' check (estado in ('confirmada', 'cancelada', 'realizada')),
  cancelada_por text check (cancelada_por in ('paciente', 'psicologo')),
  motivo_cancelacion text not null default '',
  sala text,
  creada_en timestamptz not null default now()
);
create unique index citas_sin_choque on citas (usuario_id, inicio) where estado <> 'cancelada';
create index citas_usuario on citas (usuario_id, inicio);
