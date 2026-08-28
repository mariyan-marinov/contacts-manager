using ContactsManager.Application.Features.Contacts.Contracts;
using ContactsManager.Domain.Validation;
using FluentValidation;

namespace ContactsManager.Application.Features.Contacts.UpdateContact;

internal sealed class UpdateContactCommandValidator : AbstractValidator<UpdateContactCommand>
{
    public UpdateContactCommandValidator(TimeProvider clock)
    {
        RuleFor(command => command.Id).NotEmpty();

        RuleFor(command => Text.Trimmed(command.FirstName))
            .PersonNamePart()
            .OverridePropertyName(nameof(UpdateContactCommand.FirstName));

        RuleFor(command => Text.Trimmed(command.Surname))
            .PersonNamePart()
            .OverridePropertyName(nameof(UpdateContactCommand.Surname));

        RuleFor(command => command.DateOfBirth)
            .DateOfBirth(DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime));

        RuleFor(command => command.Address)
            .NotNull()
            .SetValidator(new AddressRequestValidator());

        RuleFor(command => Text.Trimmed(command.PhoneNumber))
            .PhoneNumber()
            .OverridePropertyName(nameof(UpdateContactCommand.PhoneNumber));

        RuleFor(command => IbanText.Normalise(command.Iban))
            .Iban()
            .OverridePropertyName(nameof(UpdateContactCommand.Iban));

        RuleFor(command => command.Version)
            .GreaterThan(0u)
            .WithMessage("'{PropertyName}' must be the version returned when the contact was read.");
    }
}
