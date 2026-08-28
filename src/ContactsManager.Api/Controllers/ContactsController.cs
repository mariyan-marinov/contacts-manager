using ContactsManager.Application.Common;
using ContactsManager.Application.Features.Contacts.Contracts;
using ContactsManager.Application.Features.Contacts.CreateContact;
using ContactsManager.Application.Features.Contacts.DeleteContact;
using ContactsManager.Application.Features.Contacts.GetContactById;
using ContactsManager.Application.Features.Contacts.GetContacts;
using ContactsManager.Application.Features.Contacts.UpdateContact;
using ContactsManager.Application.Messaging;
using Microsoft.AspNetCore.Mvc;

namespace ContactsManager.Api.Controllers;

[ApiController]
[Route("api/contacts")]
[Produces("application/json")]
public sealed class ContactsController(ISender sender) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public Task<PagedResult<ContactListItem>> GetContacts(
        [FromQuery] GetContactsQuery query,
        CancellationToken cancellationToken) =>
        sender.Send(query, cancellationToken);

    [HttpGet("{id:guid}", Name = nameof(GetContact))]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public Task<ContactDetail> GetContact(Guid id, CancellationToken cancellationToken) =>
        sender.Send(new GetContactByIdQuery(id), cancellationToken);

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateContact(
        CreateContactCommand command,
        CancellationToken cancellationToken)
    {
        var id = await sender.Send(command, cancellationToken);
        return CreatedAtRoute(nameof(GetContact), new { id }, null);
    }

    /// <summary>The route owns the identity; whatever the body claims is ignored.</summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateContact(
        Guid id,
        UpdateContactCommand command,
        CancellationToken cancellationToken)
    {
        await sender.Send(command with { Id = id }, cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteContact(Guid id, CancellationToken cancellationToken)
    {
        await sender.Send(new DeleteContactCommand(id), cancellationToken);
        return NoContent();
    }
}
