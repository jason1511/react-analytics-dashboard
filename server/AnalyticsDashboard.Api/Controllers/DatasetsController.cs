using AnalyticsDashboard.Api.Contracts;
using AnalyticsDashboard.Api.Contracts.Datasets;
using AnalyticsDashboard.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AnalyticsDashboard.Api.Controllers;

[ApiController]
[Route("api/datasets")]
public sealed class DatasetsController(DatasetService datasets) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<PagedResponse<DatasetResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResponse<DatasetResponse>>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        return Ok(await datasets.ListAsync(page, pageSize, cancellationToken));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType<DatasetResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DatasetResponse>> Get(
        Guid id,
        CancellationToken cancellationToken)
    {
        var dataset = await datasets.GetAsync(id, cancellationToken);
        return dataset is null ? NotFound() : Ok(dataset);
    }

    [HttpPost]
    [ProducesResponseType<DatasetResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DatasetResponse>> Create(
        CreateDatasetRequest request,
        CancellationToken cancellationToken)
    {
        var dataset = await datasets.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = dataset.Id }, dataset);
    }

    [HttpPatch("{id:guid}/name")]
    [ProducesResponseType<DatasetResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DatasetResponse>> Rename(
        Guid id,
        RenameDatasetRequest request,
        CancellationToken cancellationToken)
    {
        var dataset = await datasets.RenameAsync(id, request, cancellationToken);
        return dataset is null ? NotFound() : Ok(dataset);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        return await datasets.DeleteAsync(id, cancellationToken)
            ? NoContent()
            : NotFound();
    }
}
