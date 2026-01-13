// metadata-analyzer.js - BLOQUE 3.1
import { exiftool } from 'exiftool-vendored';
import { fileTypeFromBuffer } from 'file-type';
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

const ANALYSIS_VERSION = '3.1.0';
const EXTRACTION_VERSION = '3.1.0';

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
 * Solo extrae datos técnicos verificables.
 * Versión: 3.1.0 (Extracción Técnica No-Decisoria)
 */

// ================================
// FUNCIÓN PRINCIPAL BLOQUE 3.1
// ================================

/**
 * 🧩 Extracción de Metadatos Técnicos - BLOQUE 3.1
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
    const fileType = await fileTypeFromBuffer(fileBuffer);
    
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
        checkTimelineConsistency(metadata, intake_json, flags);
        
        // 5.2 Detección de software (solo comparación con declarado)
        checkSoftwareSignatures(metadata, intake_json, flags);
        
        // 5.3 Verificación de formato (solo si hay declaración)
        checkFormatConsistency(metadata, intake_json, flags);
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
// NUEVA FUNCIÓN PARA BLOQUE 3.1 - EXTRACCIÓN PURA
// ================================

/**
 * 🧾 Extracción Técnica de Metadatos (BLOQUE 3.1)
 * Solo extrae, no analiza, no decide
 */
export async function extractEvidenceMetadata(file_url) {
  const extraction_id = crypto.randomUUID();
  console.log(`[${extraction_id}] Iniciando extracción técnica`);
  
  let tempFilePath = null;
  try {
    // 1. Descargar archivo temporal
    tempFilePath = await downloadFile(file_url);
    
    // 2. Identificar tipo de archivo
    const fileBuffer = await fs.readFile(tempFilePath);
    const fileType = await fileTypeFromBuffer(fileBuffer);
    
    if (!fileType) {
      console.log(`[${extraction_id}] Tipo de archivo no identificable`);
      return {
        metadata: {},
        extraction_version: EXTRACTION_VERSION,
        extraction_error: 'Tipo de archivo no identificable'
      };
    }
    
    console.log(`[${extraction_id}] Tipo detectado: ${fileType.mime}`);
    
    // 3. Extraer metadatos según formato
    const rawMetadata = await extractTechnicalMetadata(tempFilePath, fileType.mime);
    
    // 4. Normalizar metadatos (claves estables)
    const normalizedMetadata = normalizeMetadata(rawMetadata);
    
    console.log(`[${extraction_id}] Extracción completada: ${Object.keys(normalizedMetadata).length} campos`);
    
    return {
      metadata: normalizedMetadata,
      extraction_version: EXTRACTION_VERSION,
      extracted_at: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`[${extraction_id}] Error en extracción:`, error.message);
    return {
      metadata: {},
      extraction_version: EXTRACTION_VERSION,
      extraction_error: error.message
    };
  } finally {
    // Limpieza
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        console.warn(`[${extraction_id}] Error limpiando archivo temporal:`, cleanupError.message);
      }
    }
  }
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
  const filename = `aura_evidence_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
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

function normalizeMetadata(rawMetadata) {
  // Normalizar claves para consistencia
  const normalized = {};
  
  // Mapear campos comunes a nombres estables
  const fieldMapping = {
    'Software': 'software',
    'CreatorTool': 'creator_tool',
    'Application': 'application',
    'ProcessingSoftware': 'processing_software',
    'DateTimeOriginal': 'date_time_original',
    'CreateDate': 'create_date',
    'ModifyDate': 'modify_date',
    'DateCreated': 'date_created',
    'CreationDate': 'creation_date',
    'FileType': 'file_type',
    'MIMEType': 'mime_type',
    'ColorSpace': 'color_space',
    'ICCProfileName': 'icc_profile_name',
    'Compression': 'compression',
    'ImageWidth': 'image_width',
    'ImageHeight': 'image_height',
    'BitsPerSample': 'bits_per_sample',
    'XResolution': 'x_resolution',
    'YResolution': 'y_resolution',
    'ResolutionUnit': 'resolution_unit'
  };
  
  // Aplicar mapeo
  Object.keys(rawMetadata).forEach(key => {
    const normalizedKey = fieldMapping[key] || key.toLowerCase().replace(/[^a-z0-9]/g, '_');
    normalized[normalizedKey] = rawMetadata[key];
  });
  
  // Detectar cadena de exportación
  normalized.export_chain_detected = detectExportChain(normalized);
  
  return normalized;
}

function detectExportChain(metadata) {
  // Detectar signos de cadena de exportación
  const chainIndicators = [
    metadata.software,
    metadata.creator_tool,
    metadata.application,
    metadata.processing_software
  ].filter(Boolean);
  
  return chainIndicators.length > 1;
}

function checkTimelineConsistency(metadata, intake_json, flags) {
  const declaredYear = intake_json?.artist_declaration?.execution_year;
  
  if (declaredYear) {
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

function checkSoftwareSignatures(metadata, intake_json, flags) {
  const softwareFields = [
    metadata.Software,
    metadata.CreatorTool,
    metadata.Application,
    metadata.ProcessingSoftware
  ];
  
  const detectedSoftware = softwareFields.filter(Boolean);
  
  if (detectedSoftware.length === 0) {
    return;
  }
  
  const declaredTools = [];
  
  if (intake_json?.genesis_declaration?.ai_tools_declared) {
    intake_json.genesis_declaration.ai_tools_declared.forEach(tool => {
      if (tool.engine) declaredTools.push(tool.engine);
      if (tool.custom_label) declaredTools.push(tool.custom_label);
    });
  }
  
  if (intake_json?.process_declaration?.software_used) {
    intake_json.process_declaration.software_used.forEach(software => {
      declaredTools.push(software);
    });
  }
  
  if (declaredTools.length > 0) {
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
    flags.add(TECHNICAL_FLAGS.SOFTWARE_SIGNATURE_UNKNOWN);
    console.log(`Software detectado sin declaración previa: ${detectedSoftware[0]}`);
  }
}

function checkFormatConsistency(metadata, intake_json, flags) {
  const declaredFormat = intake_json?.artist_declaration?.file_format;
  
  if (declaredFormat && metadata.FileType) {
    const detectedFormat = metadata.FileType.toLowerCase();
    const declaredFormatLower = declaredFormat.toLowerCase();
    
    if (!detectedFormat.includes(declaredFormatLower) && 
        !declaredFormatLower.includes(detectedFormat)) {
      flags.add(TECHNICAL_FLAGS.FORMAT_VERSION_MISMATCH);
      console.log(`Formato no coincide: Declarado ${declaredFormat}, Detectado ${detectedFormat}`);
    }
  }
}
