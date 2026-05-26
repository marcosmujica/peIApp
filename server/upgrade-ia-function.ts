import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  const sql = `
DROP FUNCTION IF EXISTS pg_ia_query(text, text, text);

CREATE OR REPLACE FUNCTION pg_ia_query(p_question text, p_wallet_id text, p_user_id text)
RETURNS jsonb AS $$
DECLARE
    v_answer text := '';
    v_days int := 7;
    v_count int;
    v_total decimal;
    v_currency text;
    v_wallet_uuid uuid;
    v_executed_sql text := '';
    v_is_pending boolean := true;
    v_is_this_month boolean := false;
BEGIN
    -- Intentar convertir wallet_id a uuid
    BEGIN
        v_wallet_uuid := p_wallet_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('answer', 'Error: ID de billetera no válido', 'sql', 'none');
    END;

    -- Detectar si se refiere a este mes
    IF p_question ILIKE '%este mes%' OR p_question ILIKE '%mensual%' THEN
        v_is_this_month := true;
        v_is_pending := false; -- Generalmente se refieren a lo ya realizado si no dicen "pendientes"
    END IF;

    -- Forzar "pendientes" si se menciona explícitamente
    IF p_question ILIKE '%pendiente%' THEN
        v_is_pending := true;
    END IF;

    -- Determinar días si se mencionan
    IF p_question ~* '([0-9]+)\s*d[íi]as' THEN
        v_days := (substring(p_question from '([0-9]+)\s*d[íi]as'))::int;
    END IF;

    -- Caso: Ingresos / Cobros
    IF p_question ILIKE '%cobro%' OR p_question ILIKE '%ingreso%' THEN
        IF v_is_this_month THEN
            v_executed_sql := 'SELECT sum(amount) FROM tickets JOIN ticket_details ... WHERE type=income AND status=completed AND created_at >= first_day_month';
            SELECT count(*), COALESCE(sum(t.amount), 0), COALESCE(max(t.currency), 'UYU')
            INTO v_count, v_total, v_currency
            FROM tickets t
            JOIN ticket_details td ON t.ticket_id = td.ticket_id
            WHERE td.wallet_id = v_wallet_uuid
              AND td.type = 'income'
              AND t.status = 'completed'
              AND t.created_at >= date_trunc('month', CURRENT_TIMESTAMP);
            
            v_answer := 'Este mes has tenido ' || v_count || ' ingresos por un total de ' || v_total || ' ' || v_currency || '.';
        ELSIF v_is_pending THEN
            v_executed_sql := 'SELECT ... FROM tickets WHERE type=income AND status=pending AND due_date <= ...';
            SELECT count(*), COALESCE(sum(t.amount), 0), COALESCE(max(t.currency), 'UYU')
            INTO v_count, v_total, v_currency
            FROM tickets t
            JOIN ticket_details td ON t.ticket_id = td.ticket_id
            WHERE td.wallet_id = v_wallet_uuid
              AND td.type = 'income'
              AND t.status = 'pending'
              AND t.due_date <= CURRENT_TIMESTAMP + (v_days || ' days')::interval;

            v_answer := 'Tienes ' || v_count || ' cobros pendientes para los próximos ' || v_days || ' días, sumando ' || v_total || ' ' || v_currency || '.';
        ELSE
            -- Ingresos generales
            v_answer := 'Has tenido un total de ' || v_total || ' en ingresos registrados.';
        END IF;

    -- Caso: Egresos / Pagos
    ELSIF p_question ILIKE '%pago%' OR p_question ILIKE '%gasto%' THEN
        IF v_is_this_month THEN
            v_executed_sql := 'SELECT sum(amount) FROM tickets ... WHERE type=expense AND status=completed AND created_at >= month';
            SELECT count(*), COALESCE(sum(t.amount), 0), COALESCE(max(t.currency), 'UYU')
            INTO v_count, v_total, v_currency
            FROM tickets t
            JOIN ticket_details td ON t.ticket_id = td.ticket_id
            WHERE td.wallet_id = v_wallet_uuid
              AND td.type = 'expense'
              AND t.status = 'completed'
              AND t.created_at >= date_trunc('month', CURRENT_TIMESTAMP);
            
            v_answer := 'Este mes has registrado ' || v_count || ' gastos por un total de ' || v_total || ' ' || v_currency || '.';
        ELSIF v_is_pending THEN
            v_executed_sql := 'SELECT ... FROM tickets WHERE type=expense AND status=pending AND due_date <= ...';
            SELECT count(*), COALESCE(sum(t.amount), 0), COALESCE(max(t.currency), 'UYU')
            INTO v_count, v_total, v_currency
            FROM tickets t
            JOIN ticket_details td ON t.ticket_id = td.ticket_id
            WHERE td.wallet_id = v_wallet_uuid
              AND td.type = 'expense'
              AND t.status = 'pending'
              AND t.due_date <= CURRENT_TIMESTAMP + (v_days || ' days')::interval;

            v_answer := 'Tienes ' || v_count || ' pagos pendientes para los próximos ' || v_days || ' días, sumando ' || v_total || ' ' || v_currency || '.';
        ELSE
            v_answer := 'Tu total de gastos acumulados es ' || v_total || ' ' || v_currency || '.';
        END IF;

    -- Caso: Saldo
    ELSIF p_question ILIKE '%saldo%' THEN
        v_executed_sql := 'SELECT balance FROM wallets WHERE wallet_id = ...';
        SELECT balance, currency INTO v_total, v_currency FROM wallets WHERE wallet_id = v_wallet_uuid;
        v_answer := 'El saldo actual en esta billetera es ' || COALESCE(v_total, 0) || ' ' || COALESCE(v_currency, 'UYU') || '.';

    ELSE
        v_executed_sql := 'Pattern unknown';
        v_answer := 'No tengo una respuesta predefinida para: "' || p_question || '". Prueba con: "ingresos este mes", "gastos pendientes" o "mi saldo".';
    END IF;

    RETURN jsonb_build_object('answer', v_answer, 'sql', v_executed_sql);
END;
$$ LANGUAGE plpgsql;
  `;
  
  try {
    console.log('Updating pg_ia_query to return JSON...');
    await dataSource.query(sql);
    console.log('Function updated successfully!');
  } catch (err) {
    console.error('Error updating function:', err);
  } finally {
    await app.close();
  }
}
bootstrap();
