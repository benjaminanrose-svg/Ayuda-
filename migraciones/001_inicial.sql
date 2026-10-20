-- Esquema inicial de ConténMente (antes Red Acompaña). Los textos libres (mensajes, estado del bot, notas) se guardan cifrados.

create table organizaciones (
  id serial primary key,
  slug text not null unique,
  nombre text not null,
  activa boolean not null default true,
  creada_en timestamptz not null default now()
);
insert into organizaciones (slug, nombre) values ('general', 'Red Acompaña');

create table usuarios (
  id serial primary key,
  correo text not null unique,
  nombre text not null,
  titulo text not null default 'Ps.',
  especialidad text not null default '',
  rol text not null default 'especialista' check (rol in ('especialista', 'admin')),
  guardia boolean not null default false,
  disponible boolean not null default false,
  activo boolean not null default true,
  clave_hash text not null,
  debe_cambiar_clave boolean not null default true,
  creado_en timestamptz not null default now(),
  ultimo_acceso timestamptz
);

create table sesiones (
  token_hash text primary key,
  usuario_id int not null references usuarios(id) on delete cascade,
  expira_en timestamptz not null,
  creada_en timestamptz not null default now()
);

create table conversaciones (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  organizacion_id int references organizaciones(id),
  estado_bot bytea,
  opciones jsonb not null default '[]',
  creada_en timestamptz not null default now(),
  ultima_actividad timestamptz not null default now()
);

create sequence folio_seq;
create table casos (
  id serial primary key,
  folio int not null unique default nextval('folio_seq'),
  conversacion_id uuid not null references conversaciones(id) on delete cascade,
  organizacion_id int references organizaciones(id),
  estado text not null check (estado in ('esperando', 'guardia', 'en_atencion', 'agendado', 'cerrado')),
  riesgo text not null default 'low',
  urgente boolean not null default false,
  senales text[] not null default '{}',
  temas text[] not null default '{}',
  seguro text not null default 'Sin preguntar',
  menor boolean not null default false,
  mensaje_clave_id bigint,
  escalar_en timestamptz,
  escalado_en timestamptz,
  tomado_por int references usuarios(id),
  tomado_en timestamptz,
  agendado_para timestamptz,
  recordado boolean not null default false,
  alerta_sin_respuesta_en timestamptz,
  cerrado_en timestamptz,
  nota_cierre bytea,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create unique index casos_un_abierto on casos (conversacion_id) where estado <> 'cerrado';
create index casos_por_estado on casos (estado);

create table mensajes (
  id bigserial primary key,
  conversacion_id uuid not null references conversaciones(id) on delete cascade,
  autor text not null check (autor in ('persona', 'bot', 'especialista', 'sistema')),
  usuario_id int references usuarios(id),
  tipo text not null default 'texto',
  contenido bytea not null,
  riesgo text,
  creado_en timestamptz not null default now()
);
create index mensajes_por_conversacion on mensajes (conversacion_id, id);

create table suscripciones (
  endpoint text primary key,
  usuario_id int references usuarios(id) on delete cascade,
  conversacion_id uuid references conversaciones(id) on delete cascade,
  datos jsonb not null,
  creada_en timestamptz not null default now()
);

create table auditoria (
  id bigserial primary key,
  usuario_id int references usuarios(id) on delete set null,
  accion text not null,
  caso_id int references casos(id) on delete set null,
  detalle jsonb,
  creado_en timestamptz not null default now()
);

create table ajustes (
  clave text primary key,
  valor jsonb not null
);
