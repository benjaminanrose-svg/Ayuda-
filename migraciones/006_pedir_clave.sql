-- «¿Olvidaste tu clave?»: guarda cuándo alguien pidió ayuda para que administración lo vea y le genere una clave temporal.
alter table usuarios add column pide_clave_en timestamptz;
