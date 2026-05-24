using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ToolRoomAPI.Data;
using ToolRoomAPI.Dtos;
using ToolRoomAPI.Models;

namespace ToolRoomAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ToolRoomDbContext _context;

        public AuthController(ToolRoomDbContext context)
        {
            _context = context;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDto dto)
        {
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(x => x.Username == dto.Username);

            if (existingUser != null)
            {
                return BadRequest("Bu kullanıcı adı zaten kullanılıyor.");
            }

            var user = new User
            {
                FullName = dto.FullName,
                Username = dto.Username,
                Password = dto.Password,
                Role = dto.Role
            };

            _context.Users.Add(user);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "Kullanıcı başarıyla oluşturuldu.",
                user.Id,
                user.FullName,
                user.Username,
                user.Role
            });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(x =>
                    x.Username == dto.Username &&
                    x.Password == dto.Password
                );

            if (user == null)
            {
                return Unauthorized("Kullanıcı adı veya şifre hatalı.");
            }

            return Ok(new
            {
                Message = "Giriş başarılı.",
                user.Id,
                user.FullName,
                user.Username,
                user.Role
            });
        }
    }
}