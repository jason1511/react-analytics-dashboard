using AnalyticsDashboard.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AnalyticsDashboard.Api.Migrations;

[DbContext(typeof(AnalyticsDbContext))]
[Migration("20260815060000_InitialDatasets")]
public sealed class InitialDatasets : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "datasets",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                original_file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                row_count = table.Column<int>(type: "integer", nullable: true),
                column_count = table.Column<int>(type: "integer", nullable: true),
                size_bytes = table.Column<long>(type: "bigint", nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_datasets", item => item.id);
            });

        migrationBuilder.CreateIndex(
            name: "ix_datasets_created_at",
            table: "datasets",
            column: "created_at");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "datasets");
    }
}
