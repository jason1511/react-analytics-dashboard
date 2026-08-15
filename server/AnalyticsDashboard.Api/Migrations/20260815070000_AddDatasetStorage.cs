using AnalyticsDashboard.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AnalyticsDashboard.Api.Migrations;

[DbContext(typeof(AnalyticsDbContext))]
[Migration("20260815070000_AddDatasetStorage")]
public sealed class AddDatasetStorage : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "storage_key",
            table: "datasets",
            type: "character varying(80)",
            maxLength: 80,
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "storage_key",
            table: "datasets");
    }
}
