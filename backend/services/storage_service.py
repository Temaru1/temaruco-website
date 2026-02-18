"""
Supabase Cloud Storage Service
Handles file uploads, deletions, and public URL generation for product images.
"""

import os
import uuid
import logging
from typing import Optional, Tuple
from supabase import create_client, Client
from fastapi import UploadFile, HTTPException

logger = logging.getLogger(__name__)

# Initialize Supabase client (lazy initialization)
_supabase_client: Optional[Client] = None

# Allowed image types
ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def get_supabase_config():
    """Get Supabase configuration from environment (lazy loading)"""
    return {
        'url': os.environ.get('SUPABASE_URL'),
        'key': os.environ.get('SUPABASE_KEY'),
        'bucket': os.environ.get('SUPABASE_BUCKET', 'product-images')
    }


def get_supabase_client() -> Client:
    """Get or create Supabase client (lazy initialization)"""
    global _supabase_client
    
    if _supabase_client is None:
        config = get_supabase_config()
        if not config['url'] or not config['key']:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment")
        
        _supabase_client = create_client(config['url'], config['key'])
        logger.info("Supabase client initialized successfully")
    
    return _supabase_client


async def ensure_bucket_exists() -> bool:
    """Ensure the storage bucket exists, create if needed"""
    try:
        client = get_supabase_client()
        config = get_supabase_config()
        bucket_name = config['bucket']
        
        # List existing buckets
        buckets = client.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        
        if bucket_name not in bucket_names:
            # Create the bucket with public access
            client.storage.create_bucket(
                bucket_name,
                options={
                    'public': True,
                    'file_size_limit': MAX_FILE_SIZE
                }
            )
            logger.info(f"Created Supabase bucket: {bucket_name}")
        else:
            logger.info(f"Supabase bucket exists: {bucket_name}")
        
        return True
    except Exception as e:
        logger.error(f"Error ensuring bucket exists: {str(e)}")
        return False


def validate_image_file(file: UploadFile) -> Tuple[bool, str]:
    """
    Validate an image file before upload.
    Returns (is_valid, error_message)
    """
    if not file.filename:
        return False, "No filename provided"
    
    # Check file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Invalid file extension. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
    
    # Check content type
    if file.content_type and file.content_type not in ALLOWED_IMAGE_TYPES:
        return False, f"Invalid file type. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}"
    
    return True, ""


async def upload_file_to_supabase(
    file: UploadFile,
    folder: str = "products",
    custom_filename: Optional[str] = None
) -> dict:
    """
    Upload a file to Supabase Storage.
    
    Args:
        file: FastAPI UploadFile object
        folder: Folder path within the bucket (e.g., "products", "fabrics", "souvenirs")
        custom_filename: Optional custom filename (without extension)
    
    Returns:
        dict with file_name, public_url, storage_path, file_size
    """
    # Validate file
    is_valid, error_msg = validate_image_file(file)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    try:
        client = get_supabase_client()
        config = get_supabase_config()
        bucket_name = config['bucket']
        
        # Read file content
        contents = await file.read()
        file_size = len(contents)
        
        # Check file size
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400, 
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # Generate unique filename
        ext = os.path.splitext(file.filename)[1].lower()
        if custom_filename:
            unique_filename = f"{custom_filename}{ext}"
        else:
            unique_filename = f"{uuid.uuid4()}{ext}"
        
        # Storage path: folder/filename
        storage_path = f"{folder}/{unique_filename}"
        
        logger.info(f"[SUPABASE] Uploading file to: {storage_path}")
        
        # Upload to Supabase
        response = client.storage.from_(bucket_name).upload(
            path=storage_path,
            file=contents,
            file_options={
                "cache-control": "3600",
                "content-type": file.content_type or "image/jpeg",
                "upsert": "true"  # Allow overwriting if same name
            }
        )
        
        # Get public URL
        public_url = client.storage.from_(bucket_name).get_public_url(storage_path)
        
        logger.info(f"[SUPABASE] File uploaded successfully: {storage_path}")
        logger.info(f"[SUPABASE] Public URL: {public_url}")
        
        return {
            'file_name': unique_filename,
            'public_url': public_url,
            'storage_path': storage_path,
            'file_size': file_size,
            'original_name': file.filename
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[SUPABASE] Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
    finally:
        # Reset file position for potential re-reads
        await file.seek(0)


async def delete_file_from_supabase(storage_path: str) -> bool:
    """
    Delete a file from Supabase Storage.
    
    Args:
        storage_path: Full path within the bucket (e.g., "products/uuid.jpg")
    
    Returns:
        True if deletion was successful
    """
    if not storage_path:
        logger.warning("[SUPABASE] No storage path provided for deletion")
        return False
    
    try:
        client = get_supabase_client()
        config = get_supabase_config()
        bucket_name = config['bucket']
        
        logger.info(f"[SUPABASE] Deleting file: {storage_path}")
        
        # Delete the file
        response = client.storage.from_(bucket_name).remove([storage_path])
        
        logger.info(f"[SUPABASE] File deleted successfully: {storage_path}")
        return True
        
    except Exception as e:
        logger.error(f"[SUPABASE] Delete error for {storage_path}: {str(e)}")
        return False


async def delete_files_from_supabase(storage_paths: list) -> int:
    """
    Delete multiple files from Supabase Storage.
    
    Args:
        storage_paths: List of full paths within the bucket
    
    Returns:
        Number of files successfully deleted
    """
    if not storage_paths:
        return 0
    
    try:
        client = get_supabase_client()
        config = get_supabase_config()
        bucket_name = config['bucket']
        
        # Filter out empty paths
        valid_paths = [p for p in storage_paths if p]
        
        if not valid_paths:
            return 0
        
        logger.info(f"[SUPABASE] Deleting {len(valid_paths)} files")
        
        # Delete in chunks of 100 to avoid API limits
        deleted_count = 0
        chunk_size = 100
        
        for i in range(0, len(valid_paths), chunk_size):
            chunk = valid_paths[i:i + chunk_size]
            response = client.storage.from_(bucket_name).remove(chunk)
            deleted_count += len(chunk)
        
        logger.info(f"[SUPABASE] Deleted {deleted_count} files successfully")
        return deleted_count
        
    except Exception as e:
        logger.error(f"[SUPABASE] Bulk delete error: {str(e)}")
        return 0


def get_public_url(storage_path: str) -> str:
    """
    Get the public URL for a file in Supabase Storage.
    
    Args:
        storage_path: Full path within the bucket
    
    Returns:
        Public URL string
    """
    if not storage_path:
        return ""
    
    try:
        client = get_supabase_client()
        config = get_supabase_config()
        return client.storage.from_(config['bucket']).get_public_url(storage_path)
    except Exception as e:
        logger.error(f"[SUPABASE] Error getting public URL: {str(e)}")
        return ""


def extract_storage_path_from_url(url: str) -> Optional[str]:
    """
    Extract the storage path from a Supabase public URL.
    
    Args:
        url: Full Supabase public URL
    
    Returns:
        Storage path (e.g., "products/uuid.jpg") or None
    """
    config = get_supabase_config()
    if not url or not config['url']:
        return None
    
    try:
        # Supabase URLs look like:
        # https://xxx.supabase.co/storage/v1/object/public/bucket-name/folder/filename.ext
        if '/storage/v1/object/public/' in url:
            # Extract everything after the bucket name
            parts = url.split(f'/storage/v1/object/public/{config["bucket"]}/')
            if len(parts) == 2:
                return parts[1]
        
        return None
    except Exception as e:
        logger.error(f"[SUPABASE] Error extracting storage path: {str(e)}")
        return None


def is_supabase_url(url: str) -> bool:
    """Check if a URL is a Supabase storage URL"""
    config = get_supabase_config()
    if not url or not config['url']:
        return False
    
    return config['url'].replace('https://', '').split('.')[0] in url
