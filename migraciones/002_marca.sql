-- Cambio de marca: la organización por defecto pasa de 'Red Acompaña' a 'ConténMente' (solo si nadie la renombró).
update organizaciones set nombre = 'ConténMente' where slug = 'general' and nombre = 'Red Acompaña';
