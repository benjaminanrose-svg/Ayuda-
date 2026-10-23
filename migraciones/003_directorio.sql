-- Directorio de psicólogos: perfiles públicos (revisados por administración) y solicitudes de hora.
alter table usuarios drop constraint if exists usuarios_rol_check;
alter table usuarios add constraint usuarios_rol_check check (rol in ('especialista', 'admin', 'psicologo'));

create table perfiles (
  usuario_id int primary key references usuarios(id) on delete cascade,
  slug text not null unique,
  resumen text not null default '',
  enfoque text not null default '',
  especialidades text[] not null default '{}',
  estudios jsonb not null default '[]',
  experiencia jsonb not null default '[]',
  modalidad text not null default 'online' check (modalidad in ('online', 'presencial', 'ambas')),
  comuna text not null default '',
  registro_sis text not null default '',
  linkedin text not null default '',
  precio int,
  foto bytea,
  estado text not null default 'borrador' check (estado in ('borrador', 'pendiente', 'publicado', 'rechazado')),
  nota_revision text not null default '',
  actualizado_en timestamptz not null default now(),
  publicado_en timestamptz
);
create index perfiles_estado on perfiles (estado);

-- lo que escribe quien pide hora (nombre, contacto, mensaje) va cifrado
create table solicitudes (
  id serial primary key,
  usuario_id int not null references usuarios(id) on delete cascade,
  contenido bytea not null,
  leida boolean not null default false,
  creada_en timestamptz not null default now()
);
create index solicitudes_usuario on solicitudes (usuario_id, creada_en desc);
