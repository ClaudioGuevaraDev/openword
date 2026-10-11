// Valida documentos .docx con DocumentFormat.OpenXml (OpenXmlValidator, Office 2019+).
// Salida: JSON { "archivo": { "error": "..."} | { "errors": ["Id|Ruta|Parte", ...] } }
using System.Text.Json;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Validation;

var result = new Dictionary<string, object>();
var validator = new OpenXmlValidator(FileFormatVersions.Microsoft365);
foreach (var path in args)
{
    try
    {
        using var doc = WordprocessingDocument.Open(path, false);
        var errors = validator.Validate(doc)
            .Select(e => $"{e.Id}|{e.Path?.XPath}|{e.Part?.Uri}")
            .Distinct()
            .OrderBy(e => e, StringComparer.Ordinal)
            .ToList();
        result[path] = new { errors };
    }
    catch (Exception ex)
    {
        // No se puede abrir: Word tampoco lo abriría.
        result[path] = new { error = ex.GetType().Name + ": " + ex.Message };
    }
}
Console.WriteLine(JsonSerializer.Serialize(result));
