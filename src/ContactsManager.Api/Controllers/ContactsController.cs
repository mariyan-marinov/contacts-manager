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

/// <summary>
/// Dispatch and nothing else: each action hands a request to the <see cref="ISender"/> and turns the
/// result into a status code. Failures are not caught here — they travel as exceptions to
/// <c>ApiExceptionHandler</c>, which owns the mapping from failure to ProblemDetails.
/// </summary>
[ApiController]
[Route("api/contacts")]
[Produces("application/json")]
public sealed class ContactsController(ISender sender) : ControllerBase
{
    /// <summary>
    /// Paging, sorting and search are bound as one object, so their defaults and their limits live
    /// with the query rather than being spelled out again in the signature.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<ContactListItem>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(HttpValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public Task<PagedResult<ContactListItem>> GetContacts(
        [FromQuery] GetContactsQuery query,
        CancellationToken cancellationToken) =>
        sender.Send(query, cancellationToken);

    [HttpGet("{id:guid}", Name = nameof(GetContact))]
    [ProducesResponseType(typeof(ContactDetail), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public Task<ContactDetail> GetContact(Guid id, CancellationToken cancellationToken) =>
        sender.Send(new GetContactByIdQuery(id), cancellationToken);

    /// <summary>
    /// 201 with a Location header pointing at the new contact, so a client learns the id it could not
    /// have known. The body is empty: everything it would carry is already at that URL.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(HttpValidationProblemDetails), StatusCodes.Status400BadRequest)]
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
    [ProducesResponseType(typeof(HttpValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
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
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteContact(Guid id, CancellationToken cancellationToken)
    {
        await sender.Send(new DeleteContactCommand(id), cancellationToken);
        return NoContent();
    }
}
