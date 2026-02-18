"""
Supabase Cloud Storage Service with Local Fallback
Handles file uploads, deletions, and public URL generation for product images.
Falls back to local storage if Supabase is not configured or authentication fails.
"""

import os
import uuid
import logging
from pathlib import Path
from typing import Optional, Tuple
from fastapi import UploadFile, HTTPException

logger = logging.getLogger(__name__)

# Initialize Supabase client (lazy initialization)
_supabase_client = None
_supabase_available = None  # None = not checked, True/False = result

# Allowed image types
ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Local upload directory
LOCAL_UPLOAD_DIR = Path('/app/backend/uploads')
LOCAL_UPLOAD_DIR.mkdir(exist_ok=True)


def get_supabase_config():
    """Get Supabase configuration from environment (lazy loading)"""
    return {
        'url': os.environ.get('SUPABASE_URL'),
        'key': os.environ.get('SUPABASE_KEY'),
        'bucket': os.environ.get('SUPABASE_BUCKET', 'product-images')
    }


def get_supabase_client():
    """Get or create Supabase client (lazy initialization)"""
    global _supabase_client, _supabase_available
    
    if _supabase_available is False:
        return None
    
    if _supabase_client is None:
        config = get_supabase_config()
        if not config['url'] or not config['key']:
            logger.warning("Supabase credentials not configured - using local storage")
            _supabase_available = False
            return None
        
        try:
            from supabase import create_client
            _supabase_client = create_client(config['url'], config['key'])
            logger.info("Supabase client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            _supabase_available = False
            return None
    
    return _supabase_client


async def ensure_bucket_exists() -> bool:
    """Ensure the storage bucket exists - skip if using local storage"""
    global _supabase_available
    
    client = get_supabase_client()
    if client is None:
        logger.info("Using local storage - skipping bucket check")
        return True
    
    try:
        config = get_supabase_config()
        bucket_name = config['bucket']
        
        # Try a simple operation to verify authentication
        # Try to get bucket info instead of listing all buckets
        try:
            result = client.storage.from_(bucket_name).list()
            logger.info(f"Supabase bucket '{bucket_name}' is accessible")
            _supabase_available = True
            return True
        except Exception as list_error:
            # Bucket might not exist or auth failed
            error_msg = str(list_error)
            if 'signature verification failed' in error_msg.lower() or 'unauthorized' in error_msg.lower():
                logger.warning(f"Supabase authentication failed: {error_msg}")
                logger.warning("Falling back to local storage. Please verify your Supabase service role key.")
                _supabase_available = False
                return True  # Return true to not fail startup, will use local storage
            elif 'not found' in error_msg.lower():
                # Try to create the bucket
                try:
                    client.storage.create_bucket(
                        bucket_name,
                        options={'public': True, 'file_size_limit': MAX_FILE_SIZE}
                    )
                    logger.info(f"Created Supabase bucket: {bucket_name}")
                    _supabase_available = True
                    return True
                except Exception as create_error:
                    logger.error(f"Failed to create bucket: {create_error}")
                    _supabase_available = False
                    return True
            else:
                logger.error(f"Supabase error: {error_msg}")
                _supabase_available = False
                return True
                
    except Exception as e:
        logger.error(f"Error checking bucket: {str(e)}")
        _supabase_available = False
        return True  # Don't fail startup


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
    Upload a file to Supabase Storage (or local storage as fallback).
    
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
        
        # Try Supabase upload first
        client = get_supabase_client()
        if client is not None and _supabase_available is not False:
            try:
                config = get_supabase_config()
                bucket_name = config['bucket']
                storage_path = f"{folder}/{unique_filename}"
                
                logger.info(f"[SUPABASE] Uploading file to: {storage_path}")
                
                # Upload to Supabase
                response = client.storage.from_(bucket_name).upload(
                    path=storage_path,
                    file=contents,
                    file_options={
                        "cache-control": "3600",
                        "content-type": file.content_type or "image/jpeg",
                        "upsert": "true"
                    }
                )
                
                # Get public URL
                public_url = client.storage.from_(bucket_name).get_public_url(storage_path)
                
                logger.info(f"[SUPABASE] File uploaded successfully: {storage_path}")
                
                return {
                    'file_name': unique_filename,
                    'public_url': public_url,
                    'storage_path': storage_path,
                    'file_size': file_size,
                    'original_name': file.filename,
                    'storage_type': 'supabase'
                }
            except Exception as supabase_error:
                logger.warning(f"[SUPABASE] Upload failed, falling back to local: {supabase_error}")
                # Fall through to local storage
        
        # Fallback to local storage
        logger.info(f"[LOCAL] Uploading file locally: {unique_filename}")
        
        file_path = LOCAL_UPLOAD_DIR / unique_filename
        with open(file_path, 'wb') as f:
            f.write(contents)
        
        # Generate local URL
        public_url = f"/api/uploads/{unique_filename}"
        
        logger.info(f"[LOCAL] File saved successfully: {file_path}")
        
        return {
            'file_name': unique_filename,
            'public_url': public_url,
            'storage_path': str(file_path),
            'file_size': file_size,
            'original_name': file.filename,
            'storage_type': 'local'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
    finally:
        # Reset file position for potential re-reads
        await file.seek(0)


async def delete_file_from_supabase(storage_path: str) -> bool:
    """
    Delete a file from Supabase Storage (or local storage).
    
    Args:
        storage_path: Full path within the bucket (e.g., "products/uuid.jpg") or local path
    
    Returns:
        True if deletion was successful
    """
    if not storage_path:
        logger.warning("No storage path provided for deletion")
        return False
    
    try:
        # Check if it's a local file
        if storage_path.startswith('/app/backend/uploads/') or not '/' in storage_path:
            # Local file
            filename = storage_path.split('/')[-1] if '/' in storage_path else storage_path
            file_path = LOCAL_UPLOAD_DIR / filename
            if file_path.exists():
                os.remove(file_path)
                logger.info(f"[LOCAL] Deleted file: {file_path}")
            return True
        
        # Try Supabase deletion
        client = get_supabase_client()
        if client is not None and _supabase_available is not False:
            config = get_supabase_config()
            bucket_name = config['bucket']
            
            logger.info(f"[SUPABASE] Deleting file: {storage_path}")
            response = client.storage.from_(bucket_name).remove([storage_path])
            logger.info(f"[SUPABASE] File deleted successfully: {storage_path}")
            return True
        
        return False
        
    except Exception as e:
        logger.error(f"Delete error for {storage_path}: {str(e)}")
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
    
    deleted_count = 0
    for path in storage_paths:
        if await delete_file_from_supabase(path):
            deleted_count += 1
    
    return deleted_count


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
    
    # Check if it's a local file
    if storage_path.startswith('/app/backend/uploads/'):
        filename = storage_path.split('/')[-1]
        return f"/api/uploads/{filename}"
    
    try:
        client = get_supabase_client()
        if client is not None and _supabase_available is not False:
            config = get_supabase_config()
            return client.storage.from_(config['bucket']).get_public_url(storage_path)
    except Exception as e:
        logger.error(f"Error getting public URL: {str(e)}")
    
    return ""


def extract_storage_path_from_url(url: str) -> Optional[str]:
    """
    Extract the storage path from a Supabase public URL.
    
    Args:
        url: Full Supabase public URL
    
    Returns:
        Storage path (e.g., "products/uuid.jpg") or None
    """
    if not url:
        return None
    
    # Check if it's a local URL
    if '/api/uploads/' in url:
        return url.split('/api/uploads/')[-1]
    
    config = get_supabase_config()
    if not config['url']:
        return None
    
    try:
        # Supabase URLs look like:
        # https://xxx.supabase.co/storage/v1/object/public/bucket-name/folder/filename.ext
        if '/storage/v1/object/public/' in url:
            parts = url.split(f'/storage/v1/object/public/{config["bucket"]}/')
            if len(parts) == 2:
                return parts[1]
        
        return None
    except Exception as e:
        logger.error(f"Error extracting storage path: {str(e)}")
        return None


def is_supabase_url(url: str) -> bool:
    """Check if a URL is a Supabase storage URL"""
    if not url:
        return False
    
    config = get_supabase_config()
    if not config['url']:
        return False
    
    # Extract domain from Supabase URL
    supabase_domain = config['url'].replace('https://', '').split('.')[0]
    return supabase_domain in url
