using FluentValidation;

namespace ContactsManager.Application.Features.Contacts.DeleteContact;

internal sealed class DeleteContactCommandValidator : AbstractValidator<DeleteContactCommand>
{
    public DeleteContactCommandValidator() => RuleFor(command => command.Id).NotEmpty();
}
