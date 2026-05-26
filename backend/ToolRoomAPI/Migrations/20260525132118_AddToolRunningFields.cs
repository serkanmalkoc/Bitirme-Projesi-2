using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolRoomAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddToolRunningFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsRunning",
                table: "Tools",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "StartedAt",
                table: "Tools",
                type: "datetime(6)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsRunning",
                table: "Tools");

            migrationBuilder.DropColumn(
                name: "StartedAt",
                table: "Tools");
        }
    }
}
