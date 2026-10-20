-- Esquema inicial de Red Acompaña. El texto libre (mensajes, estado del bot, notas) se guarda cifrado (AES-256-GCM).

create table ajustes (
  clave text primary key,
  valor text not null,
  actualizado_en timestamptz not null default now()
);

create table organizaciones (
  id serial primary key,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  nombre text not null,
  activa boolean not null default true,
  creada_en timestamptz not null default now()
);

create table usuarios (
  id serial primary key,
  email text not null unique,
  nombre text not null,
  titulo text not null default 'Ps.',
  especialidad text not null default '',
  rol text not null default 'especialista' check (rol in ('especialista', 'admin')),
  atiende boolean not null default true,
  guardia boolean not null default false,
  disponible boolean not null default false,
  activo boolean not null default true,
  clave_hash text not null,
  debe_cambiar_clave boolean not null default true,
  creado_en timestamptz not null default now(),
  ultimo_acceso timestamptz
);

create table sesiones (
  token_hash bytea primary key,
  usuario_id int not null references usuarios(id) on delete cascade,
  creada_en timestamptz not null default now(),
  expira_en timestamptz not null
);
create index sesiones_usuario on sesiones (usuario_id);

create table conversaciones (
  id uuid primary key default gen_random_uuid(),
  token_hash bytea not null unique,
  organizacion_id int not null references organizaciones(id),
  estado_bot bytea not null,
  modo text not null default 'normal',
  ultimos_chips text[] not null default '{}',
  crisis jsonb,
  creada_en timestamptz not null default now(),
  ultima_actividad timestamptz not null default now()
);

create sequence folio_seq start 1;

create table casos (
  id serial primary key,
  folio int not null unique default nextval('folio_seq'),
  conversacion_id uuid not null references conversaciones(id) on delete cascade,
  organizacion_id int not null references organizaciones(id),
  estado text not null check (estado in ('esperando', 'escalado', 'en_atencion', 'agendado', 'cerrado')),
  riesgo text not null default 'low' check (riesgo in ('low', 'mid', 'high')),
  urgente boolean not null default false,
  senales text[] not null default '{}',
  temas text[] not null default '{}',
  seguro text not null default 'Sin preguntar',
  menor boolean not null default false,
  mensaje_clave_id bigint,
  clave_rango int not null default 0,
  mensajes_persona int not null default 0,
  escalar_en timestamptz,
  escalado_en timestamptz,
  tomado_por int references usuarios(id),
  tomado_en timestamptz,
  agendado_para timestamptz,
  agendado_con int references usuarios(id),
  recordado_en timestamptz,
  alerta_sin_respuesta_en timestamptz,
  cerrado_en timestamptz,
  cerrado_por int references usuarios(id),
  nota_cierre bytea,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create unique index casos_uno_abierto on casos (conversacion_id) where estado <> 'cerrado';
create index casos_por_estado on casos (estado, riesgo, creado_en);

create table mensajes (
  id bigserial primary key,
  conversacion_id uuid not null references conversaciones(id) on delete cascade,
  caso_id int references casos(id) on delete set null,
  autor text not null check (autor in ('persona', 'bot', 'especialista', 'sistema')),
  usuario_id int references usuarios(id),
  tipo text not null default 'texto' check (tipo in ('texto', 'respiracion', 'aviso', 'alerta')),
  contenido bytea not null,
  riesgo text,
  creado_en timestamptz not null default now()
);
create index mensajes_por_conversacion on mensajes (conversacion_id, id);

create table suscripciones_push (
  id serial primary key,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  usuario_id int references usuarios(id) on delete cascade,
  conversacion_id uuid references conversaciones(id) on delete cascade,
  creada_en timestamptz not null default now(),
  check ((usuario_id is null) <> (conversacion_id is null))
);

create table auditoria (
  id bigserial primary key,
  usuario_id int references usuarios(id),
  accion text not null,
  caso_id int references casos(id) on delete set null,
  detalle jsonb not null default '{}',
  creado_en timestamptz not null default now()
);
create index auditoria_fecha on auditoria (creado_en desc);

insert into organizaciones (slug, nombre) values ('general', 'Red Acompaña');
