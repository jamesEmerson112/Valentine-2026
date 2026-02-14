#[macro_use]
extern crate rocket;

use rand::seq::SliceRandom;
use rocket::serde::json::Json;
use rocket_cors::{AllowedOrigins, CorsOptions};
use serde::Serialize;

#[derive(Serialize)]
struct HealthResponse {
    status: String,
    service: String,
}

#[derive(Serialize)]
struct ValentineResponse {
    message: String,
    from: String,
}

const LOVE_QUOTES: &[&str] = &[
    "You are the reason I believe in love.",
    "Every love story is beautiful, but ours is my favorite.",
    "In all the world, there is no heart for me like yours.",
    "I love you more than yesterday, less than tomorrow.",
    "You had me at hello.",
    "To love and be loved is to feel the sun from both sides.",
    "My heart is, and always will be, yours.",
    "I wish I could turn back the clock. I'd find you sooner and love you longer.",
    "You are my today and all of my tomorrows.",
    "I fell in love the way you fall asleep: slowly, and then all at once.",
];

#[get("/health")]
fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        service: "valentine-backend".to_string(),
    })
}

#[get("/api/valentine")]
fn valentine() -> Json<ValentineResponse> {
    let mut rng = rand::thread_rng();
    let quote = LOVE_QUOTES.choose(&mut rng).unwrap_or(&"I love you!");

    Json(ValentineResponse {
        message: quote.to_string(),
        from: "Your Valentine".to_string(),
    })
}

#[launch]
fn rocket() -> _ {
    let cors = CorsOptions {
        allowed_origins: AllowedOrigins::all(),
        ..Default::default()
    }
    .to_cors()
    .expect("CORS configuration failed");

    rocket::build()
        .attach(cors)
        .mount("/", routes![health, valentine])
}
