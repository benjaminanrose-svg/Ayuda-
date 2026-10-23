-- Perfil: fondo (imagen propia o uno de los diseños de ConténMente) y diplomas o certificados subidos por el psicólogo.
alter table perfiles add column fondo bytea;
alter table perfiles add column fondo_diseno text not null default 'calma';

create table documentos (
  id serial primary key,
  usuario_id int not null references usuarios(id) on delete cascade,
  tipo text not null default 'diploma' check (tipo in ('titulo', 'diploma', 'certificado', 'otro')),
  nombre text not null,
  tipo_archivo text not null check (tipo_archivo in ('application/pdf', 'image/jpeg', 'image/png')),
  archivo bytea not null,
  publico boolean not null default true,
  creado_en timestamptz not null default now()
);
create index documentos_usuario on documentos (usuario_id, creado_en);
