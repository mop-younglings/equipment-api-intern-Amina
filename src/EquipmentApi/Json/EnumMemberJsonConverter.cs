using System.Reflection;
using System.Runtime.Serialization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace EquipmentApi.Json;

public class EnumMemberJsonConverter<TEnum> : JsonConverter<TEnum> where TEnum : struct, Enum
{
    public override TEnum Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var value = reader.GetString();
        if (value is null)
        {
            throw new JsonException($"Cannot convert null to {typeof(TEnum).Name}");
        }

        return EnumJsonHelper.FromEnumMemberValue<TEnum>(value);
    }

    public override void Write(Utf8JsonWriter writer, TEnum value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(EnumJsonHelper.ToEnumMemberValue(value));
    }
}

public static class EnumJsonHelper
{
    public static string ToEnumMemberValue<TEnum>(TEnum value) where TEnum : struct, Enum
    {
        return ToEnumMemberValue((Enum)value);
    }

    public static string ToEnumMemberValue(Enum value)
    {
        var member = value.GetType().GetMember(value.ToString()).FirstOrDefault();
        var attribute = member?.GetCustomAttribute<EnumMemberAttribute>();
        return attribute?.Value ?? JsonNamingPolicy.CamelCase.ConvertName(value.ToString());
    }

    public static TEnum FromEnumMemberValue<TEnum>(string value) where TEnum : struct, Enum
    {
        foreach (var field in typeof(TEnum).GetFields(BindingFlags.Public | BindingFlags.Static))
        {
            var attribute = field.GetCustomAttribute<EnumMemberAttribute>();
            if (string.Equals(attribute?.Value, value, StringComparison.OrdinalIgnoreCase)
                || string.Equals(field.Name, value, StringComparison.OrdinalIgnoreCase))
            {
                return (TEnum)field.GetValue(null)!;
            }
        }

        throw new JsonException($"Unknown {typeof(TEnum).Name} value: {value}");
    }
}

public static class JsonSerializerOptionsExtensions
{
    public static void ConfigureApiJson(this JsonSerializerOptions options)
    {
        options.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
        options.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.Converters.Add(new JsonStringEnumConverterWithEnumMember());
    }
}

public sealed class JsonStringEnumConverterWithEnumMember : JsonConverterFactory
{
    public override bool CanConvert(Type typeToConvert)
    {
        return typeToConvert.IsEnum;
    }

    public override JsonConverter? CreateConverter(Type typeToConvert, JsonSerializerOptions options)
    {
        var converterType = typeof(EnumMemberJsonConverter<>).MakeGenericType(typeToConvert);
        return (JsonConverter?)Activator.CreateInstance(converterType);
    }
}
