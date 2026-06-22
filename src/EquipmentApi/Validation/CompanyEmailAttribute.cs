using System.ComponentModel.DataAnnotations;
using System.Net.Mail;
using EquipmentApi.Constants;

namespace EquipmentApi.Validation;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class CompanyEmailAttribute : ValidationAttribute
{
    public CompanyEmailAttribute() : base(AuthConstants.CompanyEmailMessage)
    {
    }

    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        if (value is not string email || string.IsNullOrWhiteSpace(email))
        {
            return ValidationResult.Success;
        }

        try
        {
            var address = new MailAddress(email);
            if (!address.Address.Equals(email, StringComparison.OrdinalIgnoreCase))
            {
                return new ValidationResult(ErrorMessage);
            }

            var domain = address.Host;
            if (!domain.Equals(AuthConstants.CompanyEmailDomain, StringComparison.OrdinalIgnoreCase))
            {
                return new ValidationResult(ErrorMessage);
            }

            return ValidationResult.Success;
        }
        catch (FormatException)
        {
            return new ValidationResult(ErrorMessage);
        }
    }
}
