import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  const sql = `
CREATE OR REPLACE FUNCTION pg_ia_query(p_question text, p_wallet_id text, p_user_id text)
RETURNS text AS $$
DECLARE
    v_answer text := '';
    v_days int := 7;
    v_count int;
    v_total decimal;
    v_currency text;
    v_wallet_uuid uuid;
BEGIN
    -- Intentar convertir wallet_id a uuid
    BEGIN
        v_wallet_uuid := p_wallet_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN 'Error: El ID de billetera proporcionado no es un UUID válido (' || p_wallet_id || ')';
    END;

    -- Determinar días si se mencionan
    IF p_question ~* '([0-9]+)\s*d[íi]as' THEN
        v_days := (substring(p_question from '([0-9]+)\s*d[íi]as'))::int;
    END IF;

    -- Caso: Cobros/Ingresos Pendientes
    IF p_question ILIKE '%cobro%' OR p_question ILIKE '%ingreso%' THEN
        SELECT count(*), COALESCE(sum(t.amount), 0), COALESCE(max(t.currency), 'UYU')
        INTO v_count, v_total, v_currency
        FROM tickets t
        JOIN ticket_details td ON t.ticket_id = td.ticket_id
        WHERE td.wallet_id = v_wallet_uuid
          AND td.type = 'income'
          AND t.status = 'pending'
          AND t.due_date <= CURRENT_TIMESTAMP + (v_days || ' days')::interval;

        IF v_count = 0 THEN
            v_answer := 'No tienes cobros pendientes para los próximos ' || v_days || ' días.';
        ELSE
            v_answer := 'Tienes ' || v_count || ' cobros pendientes para los próximos ' || v_days || ' días, sumando un total de ' || v_total || ' ' || v_currency || '.';
        END IF;

    -- Caso: Pagos/Gastos Pendientes
    ELSIF p_question ILIKE '%pago%' OR p_question ILIKE '%gasto%' THEN
        SELECT count(*), COALESCE(sum(t.amount), 0), COALESCE(max(t.currency), 'UYU')
        INTO v_count, v_total, v_currency
        FROM tickets t
        JOIN ticket_details td ON t.ticket_id = td.ticket_id
        WHERE td.wallet_id = v_wallet_uuid
          AND td.type = 'expense'
          AND t.status = 'pending'
          AND t.due_date <= CURRENT_TIMESTAMP + (v_days || ' days')::interval;

        IF v_count = 0 THEN
            v_answer := 'No tienes pagos pendientes para los próximos ' || v_days || ' días.';
        ELSE
            v_answer := 'Tienes ' || v_count || ' pagos pendientes para los próximos ' || v_days || ' días, por un total de ' || v_total || ' ' || v_currency || '.';
        END IF;

    -- Caso: Saldo
    ELSIF p_question ILIKE '%saldo%' THEN
        SELECT balance, currency INTO v_total, v_currency 
        FROM wallets 
        WHERE wallet_id = v_wallet_uuid;
        
        IF v_total IS NULL THEN
            v_answer := 'No pude encontrar el saldo de la billetera especificada.';
        ELSE
            v_answer := 'El saldo actual de mi billetera es ' || v_total || ' ' || v_currency || '.';
        END IF;

    ELSE
        v_answer := 'Entiendo que preguntas: "' || p_question || '", pero mi lógica nativa aún es limitada. Prueba preguntar por cobros o pagos pendientes.';
    END IF;

    RETURN v_answer;
END;
$$ LANGUAGE plpgsql;
  `;
  
  try {
    console.log('Creating pg_ia_query function...');
    await dataSource.query(sql);
    console.log('Function created successfully!');
  } catch (err) {
    console.error('Error creating function:', err);
  } finally {
    await app.close();
  }
}
bootstrap();
