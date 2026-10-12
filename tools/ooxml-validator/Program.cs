// Valida documentos .docx con DocumentFormat.OpenXml (OpenXmlValidator, reglas de Microsoft 365).
// Salida: JSON { "archivo": { "error": "..." } | { "errors": ["Id|Ruta|Parte", ...] } }
// Códigos de salida: 0 = validó todo (con o sin errores de esquema), 1 = fallo inesperado del
// validador, 2 = uso incorrecto.
using System.Text.Json;
using System.Text.Json.Serialization;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Validation;

if (args.Length == 0)
{
    Console.Error.WriteLine("Uso: dotnet OoxmlValidator.dll archivo.docx [archivo.docx ...]");
    return 2;
}

var results = new Dictionary<string, ValidationResult>(StringComparer.Ordinal);
var validator = new OpenXmlValidator(FileFormatVersions.Microsoft365);
try
{
    foreach (var path in args)
    {
        results[path] = Validate(validator, path);
    }
}
catch (Exception ex)
{
    // Un error que no es del documento (falta memoria, fallo del propio SDK…): no se disfraza
    // de "el archivo no abre".
    Console.Error.WriteLine($"Error inesperado del validador: {ex}");
    return 1;
}

Console.WriteLine(JsonSerializer.Serialize(results, ResultJson.Default.DictionaryStringValidationResult));
return 0;

static ValidationResult Validate(OpenXmlValidator validator, string path)
{
    try
    {
        using var doc = WordprocessingDocument.Open(path, false);
        var errors = validator.Validate(doc)
            .Select(e => $"{e.Id}|{e.Path?.XPath}|{e.Part?.Uri}")
            .Distinct()
            .OrderBy(e => e, StringComparer.Ordinal)
            .ToArray();
        return new ValidationResult(errors, null);
    }
    catch (Exception ex) when (ex is OpenXmlPackageException or FileFormatException or InvalidDataException or IOException)
    {
        // El paquete no se puede abrir: Word tampoco lo abriría.
        return new ValidationResult(null, $"{ex.GetType().Name}: {ex.Message}");
    }
}

/// <summary>Resultado de validar un documento: sus errores de esquema o por qué no se pudo abrir.</summary>
/// <param name="Errors">Errores de validación ("Id|XPath|Parte"), sin repetir y ordenados.</param>
/// <param name="Error">Motivo por el que el paquete no se pudo abrir.</param>
internal sealed record ValidationResult(
    [property: JsonPropertyName("errors")] string[]? Errors,
    [property: JsonPropertyName("error")] string? Error);

/// <summary>Serialización generada en compilación (sin reflexión): el formato que lee scripts/validate-ooxml.mjs.</summary>
[JsonSourceGenerationOptions(DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull)]
[JsonSerializable(typeof(Dictionary<string, ValidationResult>))]
internal sealed partial class ResultJson : JsonSerializerContext;
