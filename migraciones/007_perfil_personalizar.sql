-- Personalizar el perfil: color de acento, frase bajo el nombre y datos prácticos (a quién atiende, idiomas, pagos, primera sesión).
alter table perfiles add column color text not null default 'menta';
alter table perfiles add column lema text not null default '';
alter table perfiles add column atiende text[] not null default '{}';
alter table perfiles add column idiomas text[] not null default '{}';
alter table perfiles add column pagos text[] not null default '{}';
alter table perfiles add column primera_sesion text not null default '';
