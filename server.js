// ================================
// IMPORTS (TODOS AL PRINCIPIO)
// ================================
import express from "express";
import crypto from "crypto";
import stableStringify from "json-stable-stringify";
import { createClient } from "@supabase/supabase-js";
import { analyzeMetadata } from './metadata-analyzer.js';

// ================================
// CONFIGURACIÓN BÁSICA
// ================================
const app = express();

/**
 * 🔓 CORS SIMPLE (DESARROLLO)
 * Permite cualquier origen y maneja preflight OPTIONS
 */
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ================================
// FUNCIONES AUXILIARES (INMUTABLES)
// ================================

function calculateSHA256Deterministic(obj) {
  const stable = stableStringify(obj);
  return crypto.createHash("sha256").update(stable).digest("hex");
}

function generateCaseId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AURA-${year}-${month}-${rand}`;
}

function validateProtocolMetadata(intake) {
  if (
    !intake?.aura_protocol ||
    !intake.aura_protocol.phase ||
    !intake.aura_protocol.version ||
    !intake.aura_protocol.generated_at
  ) {
    throw new Error("Falta metadata de protocolo AURA");
  }

  if (intake.aura_protocol.version !== "1.0.0") {
    throw new Error("Versión de protocolo no soportada");
  }
}

// ================================
// ENDPOINT ÚNICO — INGESTA FORENSE
// ================================

app.post("/intake-freeze", async (req, res) => {
  try {
    const { intake_data, client_hash } = req.body;

    if (!intake_data || !client_hash) {
      return res.status(400).json({
        error: "DATOS_INCOMPLETOS",
        required: ["intake_data", "client_hash"]
      });
    }

    // 1️⃣ Validar SOLO protocolo
    validateProtocolMetadata(intake_data);

    // 2️⃣ Calcular server_hash (determinista)
    const server_hash = calculateSHA256Deterministic(intake_data);

    // 3️⃣ Insertar intake_frozen (evidencia primaria)
    const { data: frozen, error: frozenError } = await supabase
      .from("intake_frozen")
      .insert({
        aura_intake_json: intake_data,
        client_hash,
        server_hash,
        hash_match: client_hash === server_hash
      })
      .select("id, received_at")
      .single();

    if (frozenError) {
      if (frozenError.code === "23505") {
        return res.status(409).json({
          error: "DECLARACION_DUPLICADA"
        });
      }
      throw frozenError;
    }

    // 4️⃣ Crear audit_case
    const case_id = generateCaseId();

    const original_git =
      intake_data.genesis_declaration?.declared_git_level ?? 0;

    const original_cg =
      intake_data.forensic_pre_evaluation?.pre_confidence_grade ?? "CG-?";

    const { error: caseError } = await supabase
      .from("audit_cases")
      .insert({
        case_id,
        intake_frozen_id: frozen.id,
        original_git,
        original_cg,
        intake_hash: server_hash,
        status: "draft"
      });

    if (caseError) throw caseError;

    // 5️⃣ Escribir audit_log
    const { error: logError } = await supabase
      .from("audit_logs")
      .insert({
        case_id,
        action: "intake_frozen",
        details: {
          intake_frozen_id: frozen.id,
          hash_match: client_hash === server_hash
        },
        actor_type: "system",
        actor_id: "render-intake-service"
      });

    if (logError) throw logError;

    // 6️⃣ Respuesta mínima
    return res.status(201).json({
      success: true,
      case_id
    });

  } catch (err) {
    console.error("ERROR INGESTA:", err.message);

    return res.status(500).json({
      error: "ERROR_INTERNO_SISTEMA"
    });
  }
});

// ================================
// ENDPOINT 2.2 - ANÁLISIS DE METADATOS
// ================================

app.post("/analysis/metadata", async (req, res) => {
  // 🚫 DECLARACIÓN DE NO-DECISIÓN (en logs)
  console.log('===========================================');
  console.log('ANÁLISIS DE METADATOS - FASE 2.2');
  console.log('Sistema no-decisorio: Solo lectura técnica');
  console.log('No valida autenticidad. No determina uso de IA.');
  console.log('===========================================');
  
  try {
    const { case_id, file_url } = req.body;

    if (!case_id) {
      return res.status(400).json({
        error: "PARAMETROS_INCOMPLETOS",
        required: ["case_id"]
      });
    }

    // 1️⃣ Obtener caso y evidencia congelada (SOLO LECTURA)
    const { data: auditCase, error: caseError } = await supabase
      .from("audit_cases")
      .select(`
        *,
        intake_frozen (
          aura_intake_json
        )
      `)
      .eq("case_id", case_id)
      .single();

    if (caseError || !auditCase) {
      return res.status(404).json({
        error: "CASO_NO_ENCONTRADO"
      });
    }

    // 2️⃣ Ejecutar análisis no-decisorio
    const intake_json = auditCase.intake_frozen.aura_intake_json;
    
    const analysisResult = await analyzeMetadata({
      case_id,
      intake_json,
      file_url
    });

    // 3️⃣ Registrar en audit_logs (solo traza técnica)
    const { error: logError } = await supabase
      .from("audit_logs")
      .insert({
        case_id,
        action: "metadata_analysis_executed",
        details: {
          flags_count: analysisResult.metadata_flags.length,
          flags: analysisResult.metadata_flags,
          analysis_version: analysisResult.analysis_version,
          // analysis_id puede ir aquí (interno) pero NO en output
          internal_analysis_id: crypto.randomUUID()
        },
        actor_type: "system",
        actor_id: "metadata-analyzer-v2.2"
      });

    if (logError) {
      console.error("Error registrando log de análisis:", logError);
      // 🚫 NO FALLAMOS - el análisis se completó
    }

    // 4️⃣ Respuesta normalizada (EXACTAMENTE 4 CAMPOS)
    return res.status(200).json(analysisResult);

  } catch (err) {
    console.error("ERROR en endpoint de análisis:", err.message);
    
    // 🚫 ERROR CONTROLADO - nunca exponemos detalles internos
    return res.status(500).json({
      error: "ERROR_ANALISIS_TECNICO",
      message: "Fallo en análisis de metadatos. Sistema no-decisorio."
    });
  }
});

// ================================
// START SERVER
// ================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`AURA Intake running on port ${PORT}`);
});
