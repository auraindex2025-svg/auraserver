// metadata-analyzer.js
import exiftool from 'exiftool-vendored';
import FileType from 'file-type';
import pdfParse from 'pdf-parse';
import mm from 'music-metadata';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';
import crypto from 'crypto';

// ================================
// CONSTANTES Y ENUMS (INMUTABLES)
// ================================

const ANALYSIS_VERSION = '2.2.0';

const TECHNICAL_FLAGS = Object.freeze({
  METADATA_MISSING: 'METADATA_MISSING',
  UNDECLARED_SOFTWARE: 'UNDECLARED_SOFTWARE',
  TIMELINE_INCONSISTENCY: 'TIMELINE_INCONSISTENCY',
  FORMAT_VERSION_MISMATCH: 'FORMAT_VERSION_MISMATCH',
  SOFTWARE_SIGNATURE_UNKNOWN: 'SOFTWARE_SIGNATURE_UNKNOWN',
  EXPORT_CHAIN_BREAK: 'EXPORT_CHAIN_BREAK'
});

// ================================
// 🚫 DECLARACIÓN DE NO-DECISIÓN
// ================================

/*
 * Este módulo realiza análisis técnico de metadatos.
 * NO valida autenticidad. NO determina uso de IA.
 * NO invalida casos. NO modifica evidencias.
 * Solo compara datos técnicos contra declaraciones.
 * Versión: 2.2.0 (Análisis Técnico No-Decisorio)
 */

// ================================
// FUNCIÓN PRINCIPAL (READ-ONLY)
// ================================

/**
 * 🧩 Analizador de Metadatos Técnicos - FASE 2.2
 * 
 * @param {Object} params
 * @param {string} params.case_id - ID del caso AURA
 * @param {Object} params.intake_json - JSON de ingesta (solo lectura)
 * @param {string|null} params.file_url - URL del archivo (opcional)
 * @returns {Promise<Object>} Resultado del análisis
 */
export async function analyzeMetadata({ case_id, intake_json, file_url = null }) {
  const analysis_id = crypto.randomUUID();
  const generated_at = new Date().toISOString();
  
  console.log(`[${analysis_id}] Iniciando análisis no-decisorio para caso: ${case_id}`);
  console.log(`[${analysis_id}] DECLARACIÓN: Análisis técnico. No valida, no certifica, no decide.`);
  
  const flags = new Set();
  
  // 🪜 PASO 1: Validar entrada mínima
  if (!file_url) {
    flags.add(TECHNICAL_FLAGS.METADATA_MISSING);
    console.log(`[${analysis_id}] No hay archivo asociado. Flag: METADATA_MISSING`);
    
    return {
      case_id,
      metadata_flags: Array.from(flags),
      analysis_version: ANALYSIS_VERSION,
      generated_at
    };
  }
  
  // 🪜 PASO 2: Descargar archivo temporalmente
  let tempFilePath = null;
  try {
    tempFilePath = await downloadFile(file_url);
    console.log(`[${analysis_id}] Archivo descargado: ${tempFilePath}`);
  } catch (error) {
    console.error(`[${analysis_id}] Error descargando archivo:`, error.message);
    flags.add(TECHNICAL_FLAGS.METADATA_MISSING);
    
    return {
      case_id,
      metadata_flags: Array.from(flags),
      analysis_version: ANALYSIS_VERSION,
      generated_at
    };
  }
  
  try {
    // 🪜 PASO 3: Identificar tipo de archivo
    const fileBuffer = await fs.readFile(tempFilePath);
    const fileType = await FileType.fromBuffer(fileBuffer);
    
    if (!fileType) {
      flags.add(TECHNICAL_FLAGS.METADATA_MISSING);
      console.log(`[${analysis_id}] Tipo de archivo no identificable`);
    } else {
      console.log(`[${analysis_id}] Tipo detectado: ${fileType.mime}`);
      
      // 🪜 PASO 4: Extraer metadatos según formato
      const metadata = await extractTechnicalMetadata(tempFilePath, fileType.mime);
      console.log(`[${analysis_id}] Metadatos extraídos:`, Object.keys(metadata).length, 'campos');
      
      // 🪜 PASO 5: Análisis de metadatos (solo lectura, no interpretación)
      if (Object.keys(metadata).length === 0) {
        flags.add(TECHNICAL_FLAGS.METADATA_MISSING);
      } else {
        // 5.1 Comparación de timeline (solo fechas objetivas)
        await checkTimelineConsistency(metadata, intake_json, flags);
        
        // 5.2 Detección de software (solo comparación con declarado)
        await checkSoftwareSignatures(metadata, intake_json, flags);
        
        // 5.3 Verificación de formato (solo si hay declaración)
        await checkFormatConsistency(metadata, intake_json, flags);
      }
    }
    
  } catch (error) {
    console.error(`[${analysis_id}] Error en análisis:`, error.message);
    // 🚫 NO PROPAGAMOS ERRORES - solo agregamos flag
    flags.add(TECHNICAL_FLAGS.METADATA_MISSING);
  } finally {
    // 🧹 Limpieza del archivo temporal
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
        console.log(`[${analysis_id}] Archivo temporal eliminado`);
      } catch (cleanupError) {
        console.warn(`[${analysis_id}] Error limpiando archivo temporal:`, cleanupError.message);
      }
    }
  }
  
  // 🪜 PASO 6: Preparar resultado normalizado (SOLO 4 CAMPOS)
  const result = {
    case_id,
    metadata_flags: Array.from(flags),
    analysis_version: ANALYSIS_VERSION,
    generated_at
  };
  
  console.log(`[${analysis_id}] Análisis completado. Flags: ${result.metadata_flags.length}`);
  return result;
}

// ================================
// FUNCIONES AUXILIARES (TÉCNICAS PURAS)
// ================================

async function downloadFile(url) {
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'arraybuffer',
    timeout: 30000
  });
  
  const tempDir = tmpdir();
  const filename = `aura_analysis_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const filepath = path.join(tempDir, filename);
  
  await fs.writeFile(filepath, response.data);
  return filepath;
}

async function extractTechnicalMetadata(filePath, mimeType) {
  const metadata = {};
  
  try {
    // 📸 Imágenes (JPEG, PNG, TIFF, etc.)
    if (mimeType.startsWith('image/')) {
      const tags = await exiftool.read(filePath);
      Object.assign(metadata, tags);
    }
    
    // 📄 PDF
    else if (mimeType === 'application/pdf') {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);
      metadata.pdfInfo = pdfData.info;
      metadata.pdfMetadata = pdfData.metadata;
    }
    
    // 🎵 Video/Audio
    else if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
      const audioMetadata = await mm.parseFile(filePath);
      metadata.audioVideoInfo = audioMetadata.format;
      metadata.audioVideoTags = audioMetadata.common;
    }
    
    // 🎨 Archivos nativos (PSD, AI, etc.) - lectura básica de metadatos
    else {
      try {
        const tags = await exiftool.read(filePath);
        Object.assign(metadata, tags);
      } catch (exifError) {
        // No todos los formatos tienen metadatos extraíbles
        console.log(`Formato ${mimeType} sin metadatos extraíbles por exiftool`);
      }
    }
    
  } catch (error) {
    console.warn('Error extracción metadatos:', error.message);
    // 🚫 NO PROPAGAMOS - retornamos objeto vacío
  }
  
  return metadata;
}

async function checkTimelineConsistency(metadata, intake_json, flags) {
  // Solo comparamos fechas si existen en ambos lados
  const declaredYear = intake_json?.artist_declaration?.execution_year;
  
  if (declaredYear) {
    // Buscar cualquier fecha en metadatos
    const possibleDateFields = [
      metadata.DateTimeOriginal,
      metadata.CreateDate,
      metadata.ModifyDate,
      metadata.DateCreated,
      metadata.CreationDate
    ];
    
    const foundDate = possibleDateFields.find(date => date);
    
    if (foundDate) {
      try {
        const metadataDate = new Date(foundDate);
        if (metadataDate.getFullYear() !== declaredYear) {
          flags.add(TECHNICAL_FLAGS.TIMELINE_INCONSISTENCY);
          console.log(`Inconsistencia de timeline detectada: Declarado ${declaredYear}, Metadatos ${metadataDate.getFullYear()}`);
        }
      } catch (dateError) {
        // Fecha no parseable - no generamos flag
      }
    }
  }
}

async function checkSoftwareSignatures(metadata, intake_json, flags) {
  // Buscar firmas de software en metadatos
  const softwareFields = [
    metadata.Software,
    metadata.CreatorTool,
    metadata.Application,
    metadata.ProcessingSoftware
  ];
  
  const detectedSoftware = softwareFields.filter(Boolean);
  
  if (detectedSoftware.length === 0) {
    return; // No hay software detectado, nada que comparar
  }
  
  // 🚫 CORRECCIÓN CRÍTICA: NO filtrar por "ai_tools_declared"
  // Debemos verificar TODA declaración de software en el intake
  const declaredTools = [];
  
  // 1. Verificar si existe genesis_declaration.ai_tools_declared (sin asumir que son solo IA)
  if (intake_json?.genesis_declaration?.ai_tools_declared) {
    intake_json.genesis_declaration.ai_tools_declared.forEach(tool => {
      if (tool.engine) declaredTools.push(tool.engine);
      if (tool.custom_label) declaredTools.push(tool.custom_label);
    });
  }
  
  // 2. Verificar process_declaration.software_used (si el campo existe en futuras versiones)
  // Nota: Este campo no existe en el JSON v1.0.0, pero lo dejamos para extensibilidad
  if (intake_json?.process_declaration?.software_used) {
    intake_json.process_declaration.software_used.forEach(software => {
      declaredTools.push(software);
    });
  }
  
  // 🚫 ELIMINADO: No asumir que "ai_tools_declared" son solo herramientas de IA
  // Tratar todas las herramientas como software genérico
  
  if (declaredTools.length > 0) {
    // Hay software declarado → comparar
    detectedSoftware.forEach(software => {
      const isDeclared = declaredTools.some(declared => 
        software.toLowerCase().includes(declared.toLowerCase()) ||
        declared.toLowerCase().includes(software.toLowerCase())
      );
      
      if (!isDeclared) {
        flags.add(TECHNICAL_FLAGS.UNDECLARED_SOFTWARE);
        console.log(`Software no declarado detectado: ${software}`);
      }
    });
  } else {
    // Hay software detectado pero NO hay declaración de software
    flags.add(TECHNICAL_FLAGS.SOFTWARE_SIGNATURE_UNKNOWN);
    console.log(`Software detectado sin declaración previa: ${detectedSoftware[0]}`);
  }
}

async function checkFormatConsistency(metadata, intake_json, flags) {
  // Solo comparar si hay declaración de formato
  // Nota: El JSON v1.0.0 no tiene campo "file_format", pero dejamos para futuras versiones
  const declaredFormat = intake_json?.artist_declaration?.file_format;
  
  if (declaredFormat && metadata.FileType) {
    const detectedFormat = metadata.FileType.toLowerCase();
    const declaredFormatLower = declaredFormat.toLowerCase();
    
    // Comparación básica (podría mejorarse según necesidades)
    if (!detectedFormat.includes(declaredFormatLower) && 
        !declaredFormatLower.includes(detectedFormat)) {
      flags.add(TECHNICAL_FLAGS.FORMAT_VERSION_MISMATCH);
      console.log(`Formato no coincide: Declarado ${declaredFormat}, Detectado ${detectedFormat}`);
    }
  }
  // Si no hay declaración de formato → NO flag
}
