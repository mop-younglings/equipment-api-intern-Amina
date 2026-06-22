using System.Runtime.Serialization;
using System.Text.Json.Serialization;
using NpgsqlTypes;

namespace EquipmentApi.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum RequestType
{
    [EnumMember(Value = "loan")]
    [PgName("loan")]
    Loan,

    [EnumMember(Value = "procurement")]
    [PgName("procurement")]
    Procurement,
}
