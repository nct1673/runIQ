"""Upload hardening: only real video containers reach ffmpeg (see
app.services.video_analysis_service). No ffmpeg or DB needed."""
import pytest

from app.services.video_analysis_service import (
    FFMPEG_INPUT_GUARD,
    VideoConversionError,
    looks_like_video,
    validated_suffix,
)

HLS_PLAYLIST = b"#EXTM3U\n#EXT-X-TARGETDURATION:1\n#EXTINF:1,\nfile:///etc/hostname.ts\n#EXT-X-ENDLIST\n"


@pytest.mark.parametrize("name", ["run.mp4", "RUN.MOV", "a.b.webm", "clip.avi"])
def test_allowed_suffixes(name: str) -> None:
    assert validated_suffix(name) == name.rsplit(".", 1)[1].lower().join([".", ""])


@pytest.mark.parametrize("name", ["evil.m3u8", "x.sdp", "playlist.txt", "noext", "", None, "a.mp4.m3u8", "x.concat"])
def test_rejected_suffixes(name: str | None) -> None:
    with pytest.raises(VideoConversionError):
        validated_suffix(name)


def test_playlist_posing_as_each_container_is_rejected(tmp_path) -> None:
    f = tmp_path / "evil"
    f.write_bytes(HLS_PLAYLIST)
    for suffix in (".mp4", ".mov", ".webm", ".avi"):
        assert not looks_like_video(f, suffix)


def test_real_container_headers_are_accepted(tmp_path) -> None:
    cases = {
        ".mp4": b"\x00\x00\x00\x20ftypisom\x00\x00\x02\x00",
        ".mov": b"\x00\x00\x00\x14ftypqt  \x00\x00\x00\x00",
        ".webm": b"\x1a\x45\xdf\xa3\x01\x00\x00\x00\x00\x00\x00\x1f",
        ".avi": b"RIFF\x24\x10\x00\x00AVI LIST",
    }
    for suffix, header in cases.items():
        f = tmp_path / f"v{suffix}"
        f.write_bytes(header)
        assert looks_like_video(f, suffix), suffix


def test_header_must_match_the_claimed_container(tmp_path) -> None:
    f = tmp_path / "v.webm"
    f.write_bytes(b"\x00\x00\x00\x20ftypisom\x00\x00\x02\x00")  # mp4 bytes, .webm name
    assert not looks_like_video(f, ".webm")


def test_ffmpeg_guard_blocks_network_protocols() -> None:
    assert FFMPEG_INPUT_GUARD == ["-protocol_whitelist", "file"]
